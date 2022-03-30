// const WebSocketServer = require('ws').Server;
const { v4: uuidv4 } = require('uuid');

const list = [];
// const ws = new WebSocketServer({ port: 8341 })

class GameRoom {

  admin;
  players = [];
  maxPlayers = 13;
  id = uuidv4();
  isPrivate = false;


  constructor({ admin, maxPlayers, isPrivate }) {
    this.admin = admin;
    this.isPrivate = isPrivate;

    if (maxPlayers)
      this.maxPlayers = maxPlayers;

    list.push(this);
  }


  destroy() {
    list.splice(list.indexOf(this), 1);
    this.players = [];
    this.admin = null;
  }

}

module.exports = {
  createRoom(...args) {
    const admin = args[0].admin;
    const isPlaying = list.find(room => {
      const isAdmin = room.admin._id === admin._id;
      const isPlayer = room.players.find(player => player._id === admin._id);
      return isAdmin || isPlayer;
    });

    if (isPlaying)
      return false;

    return new GameRoom(...args);
  },

  getRooms() {
    return list;
  },

  deleteRoom({ admin, id }) {
    const room = list.find(room => room.id === id && room.admin._id === admin._id);

    if (!room)
      return false;

    room.destroy();
    return true;
  }
}