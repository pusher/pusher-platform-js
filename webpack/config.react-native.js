var _ = require('lodash');
var path = require('path');

var sharedConfig = require('./config.shared');

module.exports = _.merge(sharedConfig, {
  output: {
    library: "PusherPlatform",
    libraryTarget:"commonjs2",
    path: path.join(__dirname, "../dist/react-native"),
    filename: "pusher-platform.js"
  },
})
