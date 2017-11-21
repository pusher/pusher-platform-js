var webpack = require('webpack');

module.exports = {
  entry: {
    'pusher-platform': './src/index.ts'
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: `ts-loader?${ JSON.stringify({ logInfoToStdOut: true }) }`,
        exclude: [/node_modules/, /dist/, /example/]
      }
    ],
  },
};
