
const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  target: 'node',
  externals: [nodeExternals()], // removes node_modules from your final bundle
  entry: './build/src/index.js', // make sure this matches the main root of your code 
  output: {
    path: path.join(__dirname, 'bundle'), // this can be any path and directory you want
    filename: 'bundle.js',
  },
  optimization: {
    minimize: false, // enabling this reduces file size and readability
  },
};