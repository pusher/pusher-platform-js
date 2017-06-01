// "use strict";

// const webpack = require('webpack');

module.exports = {
  entry: {
    main: './src/app.ts',
  },
  output: {
    filename: "target/pusher-platform.js",
    libraryTarget: "umd",
    library: "Pusher Platform"
  },
  resolve: {
    // extensions: ["", ".webpack.js", ".web.js", ".ts", ".tsx", ".js"]
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
        rules: [
        {
            test: /\.tsx?$/,
            loader: 'ts-loader?' + JSON.stringify({ logInfoToStdOut: true }),
            exclude: /node_modules/,
        }
    ]
    }
};


//TODO:
//
// const pusherPlatformMinJsConfig = Object.assign({}, pusherPlatformJsConfig, {
//   output: Object.assign({}, pusherPlatformJsConfig.output, {
//     filename: "target/pusher-platform.min.js"
//   }),
//   plugins: [
//     new webpack.optimize.UglifyJsPlugin()
//   ]
// });

// const pusherPlatformSecretAuthorizerJsConfig = {
//   entry: "./src/pusher-platform-secret-authorizer.ts",
//   output: {
//     filename: "target/pusher-platform-secret-authorizer.js",
//     libraryTarget: "umd",
//     library: "PusherPlatformSecretAuthorizer"
//   },
//   resolve: {
//     extensions: ["", ".webpack.js", ".web.js", ".ts", ".tsx", ".js"]
//   },
//   module: {
//     loaders: [
//       { test: /\.ts$/, loader: "ts-loader" }
//     ]
//   }
// };

// const pusherPlatformSecretAuthorizerMinJsConfig = Object.assign({}, pusherPlatformSecretAuthorizerJsConfig, {
//   output: Object.assign({}, pusherPlatformSecretAuthorizerJsConfig.output, {
//     filename: "target/pusher-platform-secret-authorizer.min.js"
//   }),
//   plugins: [
//     new webpack.optimize.UglifyJsPlugin()
//   ]
// });

// module.exports = [
  // feeds,
  // pusherPlatformMinJsConfig,
  // pusherPlatformSecretAuthorizerJsConfig,
  // pusherPlatformSecretAuthorizerMinJsConfig
// ];
