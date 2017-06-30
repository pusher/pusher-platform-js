const path = require('path');
const webpack = require('webpack');

const baseConfig = {
  context: path.resolve('./src'),
  entry: {
    'pusher-platform': './index.ts',
  },
  output: {
    path: path.resolve('./target'),
    filename: '[name].js',
    libraryTarget: 'umd',
    library: 'PusherPlatform',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: `ts-loader?${ JSON.stringify({ logInfoToStdOut: true }) }`,
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [],
};

const minifiedConfig = Object.assign({}, baseConfig, {
  output: Object.assign({}, baseConfig.output, {
    filename: '/[name].min.js',
  }),
  plugins: [
    ...baseConfig.plugins,
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false,
        screw_ie8: true,
      },
      comments: false,
      sourceMap: true,
    }),
  ],
});

module.exports = [
  baseConfig,
  minifiedConfig,
];
