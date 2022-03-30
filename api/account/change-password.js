const of = require('await-of').of;
const UserModel = require('../../models/User');
const bcrypt = require('../../misc/bcrypt');
const useGuard = require('../../misc/useGuard');


async function controller(req, res) {
  const { username } = req.User;
  const { oldPassword, newPassword } = req.body;

  const [userRes, userErr] = await of(UserModel.findOne({ username }));

  if (userErr)
    return res.sendStatus(500);

  if (!userRes)
    return res.sendStatus(400);

  const [isCorrectPasswd, errBcrypt] = await of(bcrypt.compare(oldPassword, userRes.password));
  if (errBcrypt)
    return res.sendStatus(500);

  if (!isCorrectPasswd)
    return res.sendStatus(403);

  userRes.password = await bcrypt.hash(newPassword);
  await userRes.save();

  return res.sendStatus(200);
}


module.exports = (app) => {
  app.put('/account/change-password', useGuard, controller);
}
