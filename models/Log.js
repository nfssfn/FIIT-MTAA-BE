const config = require('../config');
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const LogModelSchema = new Schema({
  user: String,
  event: {
    type: String,
    enum: Object.values(config.game.events)
  },
  timestamp: { type: Date, default: Date.now() }
});

module.exports = mongoose.model('Log', LogModelSchema);
