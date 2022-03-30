const bcrypt = require('bcrypt');

module.exports = {
  hash(str) {
    return bcrypt.hash(str, 12);
  },
  compare(oldPassword, newPassword) {
    return bcrypt.compare(oldPassword, newPassword);
  }
}