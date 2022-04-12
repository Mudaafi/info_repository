/* eslint-env es6 */
const Dotenv = require('dotenv-webpack')
const nodeExternals = require('webpack-node-externals')

// @see https://github.com/netlify/netlify-lambda#webpack-configuration
module.exports = {
  plugins: [new Dotenv()],
  externals: [nodeExternals()],
}
