let config = require('../../../config.js');
let Feeds = require('pusher-feeds-server');

const feeds = new Feeds({ instanceId: config.instanceId, key: config.key });

feeds
  .publish('my-feed-2', { name: 'Harry Potter' })
  .then(success => {
    console.log('Publish successful');
    console.log(success.body);
  })
  .catch(error => console.log(error));
