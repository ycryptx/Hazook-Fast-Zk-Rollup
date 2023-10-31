const path = require('path')
const nodeExternals = require('webpack-node-externals')

module.exports =  {
  target: "node",
  entry: './build/src/sequencer.js', // make sure this matches the main root of your code
  externals: [
    nodeExternals({allowlist: ['@ycryptx/rollup']}),
    nodeExternals({
      modulesDir: path.resolve(__dirname, '../node_modules'),
      allowlist: ['@ycryptx/rollup']
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
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "bundle"),
    // chunkLoading: 'import',
    // chunkFormat: 'module',
    // library: {
    //   type: 'module',
    // },
  },
  // experiments: {
  //   outputModule: true,
  // },
  mode: "production",
  optimization: {
    minimize: false, // enabling this reduces file size and readability
  },
};