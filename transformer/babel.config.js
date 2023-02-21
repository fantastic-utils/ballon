const testTargets = { node: 'current' };
const productionTargets = {
  browsers: [
    // 'last 2 chrome version',
    // 'last 2 firefox version',
    // 'last 2 safari version',
    '> 1%',
    'last 2 versions',
    'not dead',
  ],
};

module.exports = {
  plugins: [
    // '@babel/plugin-proposal-nullish-coalescing-operator',
    // '@babel/plugin-proposal-optional-chaining',
    [
      '@babel/plugin-transform-runtime',
      // { version: require('@babel/helpers/package.json').version }, // eslint-disable-line
    ],
  ],
  env: {
    test: {
      presets: [['@babel/preset-env', { targets: testTargets }]],
    },
    production: {
      presets: [['@babel/preset-env', { targets: productionTargets }]],
    },
    development: {
      presets: [['@babel/preset-env', { targets: productionTargets }]],
    },
  },
};
