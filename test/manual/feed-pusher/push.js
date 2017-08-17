let config = require('../../../config.js');
let Feeds = require('pusher-feeds-server');

console.log(config);

const feeds = new Feeds({instanceId: config.instanceId, key: config.key});

feeds.publish("my-feed", { name: "Harry Potter"})
    .then(() => console.log("Publish successful"))
    .catch((error) => console.log(error));
