"use strict";

const webpack = require('webpack');

const pusherPlatformJsConfig = {
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

const pusherPlatformMinJsConfig = Object.assign({}, pusherPlatformJsConfig, {
  output: Object.assign({}, pusherPlatformJsConfig.output, {
    filename: "target/pusher-platform.min.js"
  }),
  plugins: [
    new webpack.optimize.UglifyJsPlugin()
  ]
});

const pusherPlatformSecretAuthorizerJsConfig = {
  entry: "./src/pusher-platform-secret-authorizer.ts",
  output: {
    filename: "target/pusher-platform-secret-authorizer.js",
    libraryTarget: "umd",
    library: "PusherPlatformSecretAuthorizer"
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

const pusherPlatformSecretAuthorizerMinJsConfig = Object.assign({}, pusherPlatformSecretAuthorizerJsConfig, {
  output: Object.assign({}, pusherPlatformSecretAuthorizerJsConfig.output, {
    filename: "target/pusher-platform-secret-authorizer.min.js"
  }),
  plugins: [
    new webpack.optimize.UglifyJsPlugin()
  ]
});

module.exports = [
  pusherPlatformJsConfig,
  pusherPlatformMinJsConfig,
  pusherPlatformSecretAuthorizerJsConfig,
  pusherPlatformSecretAuthorizerMinJsConfig
];
