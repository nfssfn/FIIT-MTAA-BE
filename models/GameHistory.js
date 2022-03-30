const config = require('../config');
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const GameHistoryModelSchema = new Schema({
  duration: Number,
  result: Boolean,
  role: {
    type: String,
    enum: Object.values(config.game.roles)
  },
  users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  statistics: [{ type: Schema.Types.ObjectId, ref: 'Statistic' }],
  logs: [{ type: Schema.Types.ObjectId, ref: 'Log' }],
  timestamp: { type: Date, default: Date.now() }
});

module.exports = mongoose.model('GameHistory', GameHistoryModelSchema);
