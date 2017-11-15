var _ = require('lodash');
var path = require('path');
var webpack = require('webpack');

var sharedConfig = require('./config.shared');

module.exports = _.merge(sharedConfig, {
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
