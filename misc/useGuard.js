module.exports = (req, res, next) => {
  const token = req.User;
  if (!token)
    return res.sendStatus(403);

  return next();
}