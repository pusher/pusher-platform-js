const webpack = require('webpack');

module.exports = {
  entry: {
    'pusher-platform': './src/index.ts'
  },
  output: {
    filename: 'target/[name].js',
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
        exclude: [/node_modules/, /target/ ]
      }
    ],
  },
  plugins: [
    new DtsBundlePlugin()
  ],
};

function DtsBundlePlugin(){}
DtsBundlePlugin.prototype.apply = function (compiler) {
  compiler.plugin('done', function(){
    var dts = require('dts-bundle');

    dts.bundle({
      name: 'pusher-platform',
      main: 'src/index.d.ts',
      out: '../target/index.d.ts',
      removeSource: true,
      outputAsModuleFolder: true // to use npm in-package typings
    });
  });
};
