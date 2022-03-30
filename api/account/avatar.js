const of = require('await-of').of;
const bodyParser = require('body-parser');
const imageType = require('image-type');

const UserModel = require('../../models/User');
const useGuard = require('../../misc/useGuard');


async function getAvatar(req, res) {
  const { username } = req.body;

  const [userRes, userErr] = await of(UserModel.findOne({ username }, 'avatar').exec());

  if (userErr)
    return res.sendStatus(500);

  if (!userRes || !userRes.avatar)
    return res.sendStatus(404);

  const type = imageType(userRes.avatar);
  res.type(type.mime);

  return res.send(userRes.avatar);
}


async function setAvatar(req, res) {
  const { username } = req.User;

  if (!Buffer.isBuffer(req.body))
    return res.sendStatus(400);

  const [userRes, userErr] = await of(UserModel.findOne({ username }).exec());

  if (userErr)
    return res.sendStatus(500);

  if (!userRes)
    return res.sendStatus(400);

  userRes.avatar = req.body;
  await userRes.save();

  return res.sendStatus(201);
}


module.exports = (app) => {
  app.get('/account/avatar', getAvatar);
  app.post('/account/avatar', useGuard, bodyParser.raw({
    limit: '10mb',
    type: 'image/*'
  }), setAvatar);
}
