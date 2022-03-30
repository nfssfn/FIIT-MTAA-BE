const bcrypt = require('bcrypt');
const of = require('await-of').of;
const jwt = require('../../misc/jwt');
const User = require('../../models/User');

async function controller(req, res) {
  const { username, password } = req.body;

  const [user, userErr] = await of(User.findOne({ username }, 'username name password').exec());
  if (userErr)
    return res.status(500).send('Database server error');

  if (!user)
    return res.status(404).send('User do not exists');

  const [isCorrectPasswd, errBcrypt] = await of(bcrypt.compare(password, user.password));
  if (errBcrypt)
    return res.status(500).send('Crypt exception');

  if (!isCorrectPasswd)
    return res.status(404).send('Username/password pair was not found');

  const token = jwt.sign({
    _id: user._id,
    name: user.name,
    username: user.username
  });

  return res
    .cookie('x-token', token)
    .status(200)
    .send();
}

module.exports = (app) => {
  app.post('/account/login', controller);
}