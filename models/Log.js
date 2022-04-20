const config = require('../config');
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const LogModelSchema = new Schema({
  event: String,
  data: Object,
  timestamp: { type: Date, default: new Date() }
});

module.exports = mongoose.model('Log', LogModelSchema);
