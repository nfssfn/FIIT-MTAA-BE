const UserModel = require('../../models/User');
const of = require('await-of').of;
const useGuard = require('../../misc/useGuard');

async function controller(req, res) {
  const [userRes, userErr] = await of(UserModel.findByIdAndDelete(req.User._id));

  if (userErr)
    return res.sendStatus(500);

  if (!userRes || userRes.deletedCount === 0)
    return res.sendStatus(400);

  res.clearCookie('x-token');
  return res.sendStatus(200);
}

module.exports = (app) => {
  app.delete('/account/delete-account', useGuard, controller);
}
