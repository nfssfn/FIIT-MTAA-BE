const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const StatisticModelSchema = new Schema({
  averageScore: Number,
  currentScore: Number,
  name: String
});

module.exports = mongoose.model('Statistic', StatisticModelSchema);
