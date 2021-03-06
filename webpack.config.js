module.exports = {
  // the entry point of your library
  entry: './src/index.js',
  // where 3rd-party modules can reside
  resolve: {
    modulesDirectories: ['node_modules', 'bower_components']
  },
  // watch: true,
  // watchDelay: 1000,
  output: {
    // where to put standalone build file
    path: __dirname + '/dist',
    // the name of the standalone build file
    filename: 'af-client.js',
    // the standalone build should be wrapped in UMD for interop
    libraryTarget: 'umd',
    // the name of your library in global scope
    library: 'AFClient'
  },
  externals: {
    // Specify all libraries a user need to have in his app,
    // but which can be loaded externally, e.g. from CDN
    // or included separately with a <script> tag

    // 'jquery': 'jQuery'
  },
  module: {
    loaders: [
      {
        test: /src\/.*\.js$/, 
        loader: 'babel-loader'
        // loader: 'babel-loader?experimental&optional=runtime'
      }
    ]
  }
};
