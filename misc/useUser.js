const jwt = require('./jwt');

module.exports = (req, res, next) => {
  const token = req.cookies['x-token'];
  if (!token)
    return next();

  try {
    const val = jwt.verify(token);
    req.User = {
      _id: val._id,
      username: val.username
    };
  } catch (ex) {
    res.clearCookie('x-token');
  }

  return next();
}