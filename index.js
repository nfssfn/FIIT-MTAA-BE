require('./misc/jwt');
require('./models/db');
const express = require('express');
const cookieParser = require('cookie-parser');

const config = require('./config');
const useUser = require('./misc/useUser');
const walker = require('./misc/fileWalker');

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(useUser);

(async () => {
  (await walker('./api'))
  .map(path => `.${path.substring(__dirname.length)}`)
  .forEach(api => {
    require(api)(app);
  });

  app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
  });

})();