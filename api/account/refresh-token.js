const of = require('await-of').of;
const jwt = require('../../misc/jwt');
const useGuard = require('../../misc/useGuard');
const User = require('../../models/User');

async function controller(req, res) {
  const [user, userError] = await of(User.findById(req.User._id, 'name username').exec());

  if (!user || userError)
    return res.sendStatus(400);

  const newToken = jwt.sign({
    _id: user._id,
    name: user.name,
    username: user.username
  });

  return res
    .cookie('x-token', newToken)
    .status(200)
    .send();
}

module.exports = (app) => {
  app.post('/account/refresh-token', useGuard, controller);
}