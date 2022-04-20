const { Server } = require('socket.io');

const io = new Server(undefined, {
  allowRequest: (req, callback) => {
    callback(null, true);
  }
});
io.listen(3030);
console.log('socket server is on');
io.on('connection', (s) => {
  console.log('connected -> socket');
  s.emit('hi');
});

module.exports = io;