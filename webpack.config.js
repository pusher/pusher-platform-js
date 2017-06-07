module.exports = {
  entry: {
    main: './src/service.ts',
  },
  output: {
    filename: "target/pusher-platform.js",
    libraryTarget: "umd",
    library: "PusherPlatform"
  },
  resolve: {
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
