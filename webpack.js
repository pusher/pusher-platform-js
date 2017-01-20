"use strict";

const _ = require('lodash');
const webpack = require('webpack');


const baseConfig = {
  entry: "./src/pusher-platform.ts",
  output: {
    filename: "target/pusher-platform.js",
    libraryTarget: "umd",
    library: "PusherPlatform"
  },
  resolve: {
    extensions: ["", ".webpack.js", ".web.js", ".ts", ".tsx", ".js"]
  },
  module: {
    loaders: [
      { test: /\.ts$/, loader: "ts-loader" }
    ]
  }
};

const minifiedOutput = _.extend({}, baseConfig.output, {
  filename: "target/pusher-platform.min.js"
});

const minifiedConfig = _.extend({}, baseConfig, {
  output: minifiedOutput,
  plugins: [
    new webpack.optimize.UglifyJsPlugin()
  ]
});


module.exports = [
  baseConfig,
  minifiedConfig
];
