const babelJest = require('babel-jest');
const path = require('path');

const babelConfig = path.resolve(__dirname, 'babel.config.js');

module.exports = babelJest.createTransformer({
  // rootMode: 'upward',
  configFile: babelConfig,
});
