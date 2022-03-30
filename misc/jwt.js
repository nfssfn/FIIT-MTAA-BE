const expiresIn = require('../config').jwtAliveTime;
const jwt = require('jsonwebtoken');
const fs = require('fs');

const loadKey = () => {
  try {
    return fs.readFileSync('./jwtRS256.key');
  } catch (ex) {
    console.error('Please, generate a key for JWT (jwtRS256.key)');
    process.exit(1);
  }
};

const key = loadKey();

module.exports = {
  sign(data, options) {
    return jwt.sign(data, key, { expiresIn, ...options });
  },
  verify(token) {
    return jwt.verify(token, key);
  }
}