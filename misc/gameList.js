const GameRoom = require('./Game');
const list = [];



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

    const newGame = new GameRoom(...args);
    newGame.onStart = () => list.splice(list.indexOf(newGame), 1);
    list.push(newGame);
    return newGame;
  },

  getRooms() {
    return list;
  },

  deleteRoom({ admin, id }) {
    const room = list.find(room => room.id === id && room.admin._id === admin._id);

    if (!room)
      return false;

    list.splice(list.indexOf(room), 1);
    room.destroy();
    return true;
  }
}