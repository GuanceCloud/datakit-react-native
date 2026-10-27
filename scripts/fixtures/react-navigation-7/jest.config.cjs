const path = require('node:path');

const root = process.env.GUANCE_REPO_ROOT;
const rn = path.join(__dirname, 'node_modules/react-native');
module.exports = {
  ...require(path.join(rn, 'jest-preset.js')),
  rootDir: __dirname,
  roots: [__dirname, path.join(root, 'packages')],
  haste: {
    defaultPlatform: process.env.GUANCE_TEST_PLATFORM,
    platforms: ['android', 'ios', 'native'],
  },
  testEnvironment: path.join(root, 'node_modules/jest-environment-node'),
  modulePaths: [path.join(root, 'node_modules')],
  testMatch: ['**/collection.test.js'],
  moduleNameMapper: {
    '^react-native$': rn,
    '^@jest/globals$': path.join(root, 'node_modules/@jest/globals'),
  },
  transform: {
    '^.+\\.(png|jpg|jpeg)$': path.join(rn, 'jest/assetFileTransformer.js'),
    '^.+\\.[jt]sx?$': [
      path.join(root, 'node_modules/babel-jest'),
      {
        babelrc: false,
        configFile: false,
        plugins: [
          [
            path.join(
              root,
              'node_modules/@babel/plugin-transform-private-methods'
            ),
            { loose: true },
          ],
        ],
        presets: [
          path.join(root, 'node_modules/metro-react-native-babel-preset'),
        ],
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-navigation|@react-native|react-native[^/]*|use-latest-callback)/)',
  ],
};
