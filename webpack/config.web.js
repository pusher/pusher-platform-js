var path = require('path');
var webpack = require('webpack');

var mergeDeep = require('./merge-deep');
var sharedConfig = require('./config.shared');

var config = mergeDeep(sharedConfig, {
  output: {
    library: "PusherPlatform",
    path: path.join(__dirname, "../dist/web"),
    filename: "pusher-platform.js",
    libraryTarget: "umd"
  },
  plugins: [
    new webpack.DefinePlugin({
      global: "window"
    }),
  ],
});

module.exports = config;
