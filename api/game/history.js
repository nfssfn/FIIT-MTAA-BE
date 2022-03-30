const of = require('await-of').of;
const useGuard = require('../../misc/useGuard');
const User = require('../../models/User');

async function getGamesHistoryController(req, res) {
  const [user, userError] = await of(User.findById(req.User._id, 'history').exec());

  if (!Array.isArray(user.history) || userError)
    return res.sendStatus(404);

  return res
    .status(200)
    .send(user.history);
}

module.exports = (app) => {
  app.get('/game/history', useGuard, getGamesHistoryController);
  return;
}