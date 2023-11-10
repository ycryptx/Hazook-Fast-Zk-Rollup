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
  entry: './build/src/compiler.js',
  output: {
    path: path.join(__dirname, 'bundle'), // this can be any path and directory you want
    filename: 'compiler.js',
  },
  optimization: {
    minimize: true, // enabling this reduces file size and readability
  },
  mode: 'production',
};
