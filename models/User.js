const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const UserModelSchema = new Schema({
  username: String,
  name: String,
  password: String,
  avatar: Buffer,
  history: [{ type: Schema.Types.ObjectId, ref: 'GameHistory' }]
});

module.exports = mongoose.model('User', UserModelSchema);
