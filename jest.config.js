/** @type {import('ts-jest').JestConfigWithTsJest} */
const path = require('path');
const transformer = path.resolve(__dirname, 'transformer', 'index.js');

module.exports = {
  // preset: 'ts-jest',
  transform: {
    '\\.jsx?$': transformer,
    '\\.tsx?$': 'ts-jest',
  },
  // testEnvironment: 'node',
  transformIgnorePatterns: [
    "node_modules/(?!(@fantastic-utils)/)",
  ],
};