var path = require('path');

var mergeDeep = require('./merge-deep');
var sharedConfig = require('./config.shared');

module.exports = mergeDeep(sharedConfig, {
  output: {
    library: "PusherPlatform",
    libraryTarget:"commonjs2",
    path: path.join(__dirname, "../dist/react-native"),
    filename: "pusher-platform.js"
  },
})
