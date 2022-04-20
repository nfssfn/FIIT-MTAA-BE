const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const socket = require('./socket');
const jwt = require('./jwt');

const User = require('../models/User');
const Log = require('../models/Log');
const Statistic = require('../models/Statistic');
const GameHistory = require('../models/GameHistory');

const wait = (ms = 3000, cb) => new Promise((res, rej) => setTimeout(cb ? () => cb(res, rej) : res, ms));
const sortByCount = (arr) => {
  const hashed = arr.reduce((pv, cv) => {
    pv[cv] = (pv[cv] || 0) + 1;
    return pv;
  }, {});
  return Object.keys(hashed).sort((a, b) => hashed[b] - hashed[a]);
}


class GameRoom {
  id = uuidv4().split('-')[0];
  socket;
  isPrivate = false;
  isStarted = false;
  onStart = () => {};

  admin;
  players = [];
  maxPlayers = 4;

  logs = [];

  constructor({ admin, maxPlayers, isPrivate }) {
    this.admin = admin;
    this.isPrivate = isPrivate;
    this.socket = socket.of(this.id);

    if (maxPlayers)
      this.maxPlayers = maxPlayers;

    this.socket.on('connection', (socket) => {
      if (this.players.length >= this.maxPlayers)
        return socket.disconnect();

      socket.once('lobby-register', (token) => {
        try {
          const tokenData = jwt.verify(token);
          this.players.push({
            _id: tokenData._id,
            name: tokenData.name,
            username: tokenData.username,
            socket
          });
          socket.join(`${this.uuidv4}-lobby`);
          this.notifyLobbyList();
          socket.emit('lobby-info', {
            isAdmin: this.admin?._id === tokenData._id,
            isPrivate: this.isPrivate
          });

          socket.once('disconnect', () => {
            this.players = this.players.filter(p => p._id !== tokenData._id);
            this.notifyLobbyList();
            socket.removeAllListeners();
            if (this.players.length === 0 || !this.players.map(p => p.username).includes(this.admin.username))
              this.destroy();
          });
          if (this.admin._id === tokenData._id) {
            const onStartGame = () => {
              if (this.players.length !== this.maxPlayers)
                return;

              this.players.forEach(p => p.socket.removeAllListeners());
              this.play();
            };
            socket.once('start-game', onStartGame);
            socket.on('kick-user', (username) => {
              const user = this.players.find(p => p.username === username);
              if (this.admin.username === username || !user)
                return;
              user.socket.disconnect();
            });
          }
        } catch (e) {
          socket.emit('lobby-register-error', e.message);
        }
      });
    });
  }

  notifyLobbyList() {
    this.notify('lobby-list', this.players.map(p => p.username), 'lobby');
  }

  get activePlayers() {
    return this.players.filter(p => p.active);
  }

  log(msg) {
    this.logs.push({ ...msg, time: Date.now() });
  }

  notify(ev, data = undefined, group = 'all') {
    // console.log('sending ', ev, ' -> ', typeof group === 'string' ? group : '...someone...', data);
    if (typeof group === 'string')
      this.socket.to(`${this.uuidv4}-${group}`).emit(ev, data);
    else
      group.socket.emit(ev, data);
  }

  gameOver() {
    const mafia = this.activePlayers.filter(p => p.role === config.game.roles.MAFIA);
    if (mafia.length === 0)
      return config.game.roles.CIVILIAN;

    if (this.activePlayers.length <= mafia.length * 2)
      return config.game.roles.MAFIA;

    return false;
  }

  async play() {
    if (this.isStarted)
      return;

    this.isStarted = true;
    this.onStart();

    this.players.forEach(p => {
      p.socket.join(`${this.uuidv4}-all`);
      p.socket.on('rtc-transmit', ({ to, ...data }) => {
        this.players
          .filter(ps => to.includes(ps.username) && ps.username !== p.username)
          .forEach(ps => ps.socket.emit('rtc-recieve', data));
      });
    });

    this.notify('game-preparing');
    this.log({ type: 'game-start' });

    let turn = -1;
    let roles = [
      config.game.roles.SHERIFF,
      config.game.roles.MAFIA,
      config.game.roles.DOCTOR,
      config.game.roles.CIVILIAN,
      config.game.roles.MAFIA,
      config.game.roles.CIVILIAN
    ].filter((v, i) => i < this.players.length)
    .sort(() => Math.random() - .5);

    this.players = this.players
      .map((p, i) => ({
        _id: p._id,
        socket: p.socket,
        username: p.username,
        name: p.name,
        active: true,
        role: roles[i]
      }));
    this.players.forEach(p => {
      this.notify('role-set', p.role, p);
      p.socket.join(`${this.uuidv4}-all`);
      p.socket.join(`${this.uuidv4}-${p.role}`);
      this.log({ type: 'role-set', player: p.username, role: p.role });
    });

    const accepted = await Promise.allSettled(this.players.map(p => {
      return Promise.race([
        new Promise(res => p.socket.on('role-accepted', res)),
        wait(30000, (res, rej) => rej())
      ]);
    }));

    if (accepted.some(res => res.status === 'rejected')) {
      this.notify('game-fail');
      this.destroy();
      return;
    }

    this.players.forEach(p => {
      p.socket.once('disconnect', () => p.active = false);
    });


    this.notify('game-started');
    await wait(3000);

    this.notify('game-rtc-link');
    await wait(5000);

    const gameStarted = Date.now();
    this.notify('rtc-rerender');

    while (turn++ || !0) {
      await wait(5000);
      let killed;
      this.log({ type: 'turn-started', i: turn });

      if (turn !== 0) {
        // Start night
        this.notify('game-night');
        this.notify('game-rtc-hide-all');
        this.log({ type: 'night-started' });

        // Let mafia speak
        this.notify('game-rtc-show', this.activePlayers.filter(p => p.role === config.game.roles.MAFIA).map(p => p.username), config.game.roles.MAFIA);
        await wait(30000);
        this.notify('game-rtc-hide-all');

        // Start mafia voting
        this.notify('game-voting', this.activePlayers.map(p => p.username), config.game.roles.MAFIA);
        const votesMafia = await Promise.allSettled(this.activePlayers.filter(p => p.role === config.game.roles.MAFIA).map(p => {
          return Promise.race([
            new Promise(res => p.socket.once('game-vote', (v) => {
              this.log({ type: 'vote-mafia', player: p.username, voteFor: v });
              res(v);
            })),
            wait(15000, (res, rej) => {
              p.socket.removeAllListeners('game-vote');
              rej();
            })
          ]);
        }));
        this.notify('game-voting-end', undefined, config.game.roles.MAFIA);

        // Count votes
        const votedByMafia = sortByCount(votesMafia.filter(p => p.status === 'fulfilled').map(p => p.value))[0];
        this.log({ type: 'voted-mafia', player: votedByMafia });

        // Start doctor voting
        const doctor = this.activePlayers.find(p => p.role === config.game.roles.DOCTOR);
        let votedByDoctor;
        if (doctor) {
          this.notify('game-voting', this.activePlayers.map(p => p.username), config.game.roles.DOCTOR);
          const votesDoctor = await Promise.allSettled([doctor].map(p => {
            return Promise.race([
              new Promise(res => p.socket.once('game-vote', res)),
              wait(15000, (res, rej) => {
                p.socket.removeAllListeners('game-vote');
                rej();
              })
            ]);
          }));
          this.notify('game-voting-end', undefined, config.game.roles.DOCTOR);
          this.log({ type: 'vote-doctor', player: doctor.username, voteFor: votesDoctor[0].value });
          // Count votes
          votedByDoctor = votesDoctor.filter(p => p.status === 'fulfilled')[0]?.value;
        }

        killed = votedByDoctor === votedByMafia ? undefined : votedByMafia;

        const sheriff = this.activePlayers.find(p => p.role === config.game.roles.SHERIFF);
        if (sheriff) {
          // Start sheriff voting
          this.notify('game-voting', this.activePlayers.map(p => p.username), config.game.roles.SHERIFF);
          const query = await Promise.allSettled([sheriff].map(p => {
            return Promise.race([
              new Promise(res => p.socket.once('game-vote', (who) => {
                this.log({ type: 'vote-sheriff', voteFor: who });
                res({ who, s: p.socket });
              })),
              wait(15000, (res, rej) => {
                p.socket.removeAllListeners('game-vote');
                rej();
              })
            ]);
          }));
          if (query[0].status === 'fulfilled') {
            const res = this.players.find(p => p.username === query[0].value.who).role;
            query[0].value.s.emit('game-sheriff-check', res);
            this.log({ type: 'vote-sheriff-result', result: res === config.game.roles.MAFIA });
          }
          this.notify('game-voting-end', undefined, config.game.roles.SHERIFF);
        }
      }

      this.notify('game-day');
      this.notify('game-rtc-show', this.players.map(p => p.username));
      this.log({ type: 'day-started' });



      if (turn !== 0 && killed) {
        const killedPlayer = this.activePlayers.find(p => p.username === killed);
        this.notify('game-killed', killedPlayer.username);
        this.log({ type: 'night-killed', player: killedPlayer.username });
        killedPlayer.active = false;
      }

      if (this.gameOver())
        break;

      for (let p of this.activePlayers) {
        this.notify('game-give-word', p.username);
        await wait(20 * 1000);
      }

      if (turn !== 0) {
        this.notify('game-rtc-hide-all');

        // Start kill voting
        this.activePlayers.forEach(ap => this.notify('game-voting', this.activePlayers.map(p => p.username), ap));
        const votesToKill = await Promise.allSettled(this.activePlayers.map(p => {
          return Promise.race([
            new Promise(res => p.socket.once('game-vote', (v) => {
              this.log({ type: 'vote-to-kill', player: p.username, voteFor: v });
              this.notify('player-vote', { player: p.username, voteFor: v });
              res(v);
            })),
            wait(15000, (res, rej) => {
              p.socket.removeAllListeners('game-vote');
              rej();
            })
          ]);
        }));
        this.notify('game-voting-end');

        // Count votes
        const voted = sortByCount(votesToKill.filter(p => p.status === 'fulfilled').map(p => p.value))[0];
        if (voted) {
          const killedPlayer = this.activePlayers.find(p => p.username === voted);
          this.notify('game-killed', killedPlayer.username);
          this.notify('game-give-word', killedPlayer.username);
          this.log({ type: 'day-killed', player: killedPlayer.username });
          await wait(20000);
          killedPlayer.active = false;
        }

        if (this.gameOver())
          break;

      }
    }

    this.postProcess(gameStarted, Date.now(), turn);
  }

  async postProcess(timeStart, timeEnd, turns) {
    const won = this.gameOver();
    this.notify('game-over', won);
    this.log({ type: 'game-ended', won });

    const users = await Promise.all(this.players.map(async (p) => {
      return await User.findById(p._id, '-avatar').populate('history').exec();
    }));

    this.logs = await Promise.all(this.logs.map(async ({ type, time, ...data }) => {
      return await Log.create({
        timestamp: time,
        event: type,
        data
      });
    }));

    await Promise.allSettled(this.players.map(async (p, i) => {
      const user = users[i];

      const stats = [];
      stats.push(await Statistic.create({
        averageScore: 0,
        currentScore: turns,
        name: 'turns'
      }));

      const votes = this.logs.filter(l => l.event === 'vote-to-kill' && l.data.player === p.username);
      const killed = this.logs.filter(l => l.event === 'day-killed');

      stats.push(await Statistic.create({
        averageScore: 0,
        currentScore: votes.reduce((pv, cv, i) => pv + (cv.data.voteFor === killed[i].data.player ? 1 : 0), 0),
        name: 'success-votes'
      }));

      if (p.role === config.game.roles.MAFIA)
        stats.push(await Statistic.create({
          averageScore: 0,
          currentScore: this.logs.filter(l => l.event === 'voted-mafia' && l.data.player === undefined).length,
          name: 'no-mafia-vote'
        }));

      if (p.role !== config.game.roles.MAFIA)
        stats.push(await Statistic.create({
          averageScore: 0,
          currentScore: votes.map(v => this.players.find(p => p.username === v.data.voteFor)).filter(p => p.role === config.game.roles.MAFIA).length,
          name: 'success-mafia-vote'
        }));

      if (p.role === config.game.roles.SHERIFF)
        stats.push(await Statistic.create({
          averageScore: 0,
          currentScore: this.logs.filter(l => l.event === 'vote-sheriff-result' && l.data.result === config.game.roles.MAFIA).length,
          name: 'success-sheriff-choise'
        }));


      if (p.role === config.game.roles.DOCTOR)
        stats.push(await Statistic.create({
          averageScore: 0,
          currentScore: turns - this.logs.filter(l => l.event === 'night-killed').length,
          name: 'success-sheriff-choise'
        }));

      stats.push(await Statistic.create({
        averageScore: 0,
        currentScore: turns - this.logs.filter(l => l.event === 'night-killed').length,
        name: 'no-night-killed'
      }));


      stats.push(await Statistic.create({
        averageScore: 0,
        currentScore: turns - this.logs.filter(l => l.event === 'day-killed').length,
        name: 'no-day-killed'
      }));

      try {
      const gh = await GameHistory.create({
        duration: timeEnd - timeStart,
        result: p.role === config.game.roles.MAFIA ? won === config.game.roles.MAFIA : true,
        role: p.role,
        users: users,
        statistics: stats,
        logs: this.logs
      });

      user.history.push(gh);
      await user.save();
    } catch (ex) {
      console.log('found ex', ex);
    }

    }));

    this.destroy();
  }

  destroy() {
    this.players.forEach(p => p.socket.removeAllListeners());
    this.players = [];
    this.admin = null;
    this.socket.disconnectSockets();
    this.socket = null;
  }

}

module.exports = GameRoom;
