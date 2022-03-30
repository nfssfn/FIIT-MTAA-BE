const mongoDB = require('../config').mongoConnectionString;
const mongoose = require('mongoose');

(async () => {
  mongoose.connect(mongoDB).then(() => {
    console.log('Database connection established!');
  });
  mongoose.connection.on('error', console.error.bind(console, 'MongoDB connection error:'));
})();