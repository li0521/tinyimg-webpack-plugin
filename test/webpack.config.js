const Path = require('path')
const CleanPlugin = require('clean-webpack-plugin').CleanWebpackPlugin
const HtmlPlugin = require('html-webpack-plugin')

const TinyimgPlugin = require('../dist')

const PATH = {
  entryHtml: Path.join(__dirname, 'src/index.html'),
  entryJs: Path.join(__dirname, 'src/index.js'),
  output: Path.join(__dirname, 'dist'),
}

module.exports = {
  devtool: false,
  entry: PATH.entryJs,
  mode: 'production',
  module: {
    rules: [
      {
        exclude: /node_modules/,
        test: /\.(htm|html)$/,
        use: [
          {
            loader: 'html-withimg-loader',
          },
        ],
      },
      {
        exclude: /node_modules/,
        test: /\.(jpe?g|png)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              esModule: false,
              name: '[name].[ext]',
              outputPath: 'img',
            },
          },
        ],
      },
    ],
  },
  output: {
    filename: 'js/[name].bundle.js',
    path: PATH.output,
    publicPath: '',
  },
  plugins: [
    new CleanPlugin(),
    new HtmlPlugin({
      filename: 'index.html',
      minify: { collapseWhitespace: true, removeComments: true },
      template: PATH.entryHtml,
    }),
    new TinyimgPlugin({
      enabled: true,
      logged: false,
      concurrency: 40,
      timeout: 10,
    }),
  ],
}
