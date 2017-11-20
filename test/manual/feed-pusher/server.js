let config = require('../../../config.js');
let Feeds = require('pusher-feeds-server');
let express = require('express');
let bodyParser = require('body-parser');

const feeds = new Feeds({ instanceId: config.instanceId, key: config.key });
const app = express();
app.use(bodyParser.urlencoded());
app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept',
  );
  next();
});

app.post('/path/tokens', (req, res) => {
  console.log('TOKENS');
  feeds
    .authorizePath(req.body, (action, feedId) => {
      return Promise.resolve(true);
    })
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      console.log(err);
      res.status(400).send(`${err.name}: ${err.message}`);
    });
});

app.post('/feeds/tokens', (req, res) => {
  feeds
    .authorizeFeed(req.body, (action, feedId) => {
      return Promise.resolve(true);
    })
    .then(data => {
      res.send(data);
    })
    .catch(err => {
      console.log(err);
      res.status(400).send(`${err.name}: ${err.message}`);
    });
});

app.listen(3000);
