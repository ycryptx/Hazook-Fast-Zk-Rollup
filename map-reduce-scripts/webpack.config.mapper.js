const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  target: 'node',
  externals: [
    nodeExternals({ allowlist: ['@ycryptx/rollup'] }),
    nodeExternals({
      modulesDir: path.resolve(__dirname, '../node_modules'),
      allowlist: ['@ycryptx/rollup'],
    }),
  ], // removes node_modules from your final bundle
  module: {
    rules: [
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
      },
    ],
  },
  entry: './build/src/mapper/index.js',
  output: {
    path: path.join(__dirname, 'bundle', 'mapper'), // this can be any path and directory you want
    filename: 'index.js',
  },
  optimization: {
    minimize: false, // enabling this reduces file size and readability
  },
  mode: 'production',
};
