const GameRooms = require('../../misc/gameList');
const useGuard = require('../../misc/useGuard');

async function getRoomsController(req, res) {
  const list = GameRooms.getRooms();
  return res.send(
    list
      .filter(room => !room.isPrivate || room.admin._id === req.User._id)
      .filter(room => room.players.length < room.maxPlayers)
      .map(room => ({
        id: room.id,
        usersInRoom: room.players.length,
        totalCount: room.maxPlayers - 1
      }))
  );
}

async function createRoomController(req, res) {
  const { maxPlayers, private } = req.body;
  if (typeof private !== 'boolean' || (maxPlayers && typeof maxPlayers !== 'number'))
    return res.sendStatus(400);

  const room = GameRooms.createRoom({ admin: req.User, maxPlayers, isPrivate: private });
  if (!room)
    return res.sendStatus(400);

  return res.status(201).send({ id: room.id });
}

async function deleteRoomController(req, res) {
  const { id } = req.body;
  if (!id)
    return res.sendStatus(400);

  const result = GameRooms.deleteRoom({ admin: req.User, id });
  if (!result)
    return res.sendStatus(400);

  return res.sendStatus(200);
}

module.exports = (app) => {
  app.get('/game/rooms', useGuard, getRoomsController);
  app.post('/game/rooms', useGuard, createRoomController);
  app.delete('/game/rooms', useGuard, deleteRoomController);
  return;
}