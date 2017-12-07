var _ = require('lodash');
var path = require('path');
var webpack = require('webpack');

var sharedConfig = require('./config.shared');

module.exports = _.merge(sharedConfig, {
  entry: {
    'pusher-platform.worker': './src/index.ts'
  },
  output: {
    library: "PusherPlatform",
    path: path.join(__dirname, "../dist/worker"),
    filename: "pusher-platform.worker.js"
  },
  plugins: [
    new webpack.DefinePlugin({
      global: "self"
    }),
  ]
});
