const of = require('await-of').of;
const useGuard = require('../../misc/useGuard');
const User = require('../../models/User');

async function getGamesHistoryController(req, res) {
  const [user, userError] = await of(User.findById(req.User._id, '-avatar').exec()
  );

  await user.populate('history');
  await user.populate('history.users');
  await user.populate('history.logs');
  await user.populate('history.statistics');

  if (!Array.isArray(user.history) || userError)
    return res.sendStatus(404);

  return res
    .status(200)
    .send(user.history.map(h => ({
      _id: h._id,
      diration: h.duration,
      result: h.result,
      role: h.role,
      users: (h.users || []).map(u => u.username),
      logs: h.logs,
      statistics: h.statistics,
      timestamp: h.timestamp
    })));
}

module.exports = (app) => {
  app.get('/game/history', useGuard, getGamesHistoryController);
  return;
}