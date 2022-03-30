const bcrypt = require('bcrypt');
const of = require('await-of').of;
const User = require('../../models/User');
const jwt = require('../../misc/jwt');

async function controller(req, res) {
  const { username, name, password } = req.body;

  if (!name || !username || !password)
    return res.status(400).send('Name, username and password fields are required');

  const [user, userErr] = await of(User.findOne({ username }).exec());
  if (userErr)
    return res.status(500).send('Database server error');

  if (user)
    return res.status(400).send('User already exists');

  const [passwd, errPasswd] = await of(bcrypt.hash(password, 12));
  if (errPasswd)
    return res.status(500).send('BCrypt exception');

  const [userNew, err] = await of(User.create({ username, name, password: passwd }));
  if (err)
    return res.status(500).send('Database server error');

  const token = jwt.sign({
    _id: userNew._id,
    name: userNew.name,
    username: userNew.username
  });

  return res
    .cookie('x-token', token)
    .status(201)
    .send();
}

module.exports = (app) => {
  app.post('/account/register', controller);
}