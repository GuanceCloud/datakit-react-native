const path = require('path');
const mobilePackage = require('../packages/react-native-mobile/package.json');
const sessionReplayPackage = require('../packages/react-native-session-replay/package.json');

module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          [mobilePackage.name]: path.join(
            __dirname,
            '..',
            'packages/react-native-mobile',
            mobilePackage.source
          ),
          [sessionReplayPackage.name]: path.join(
            __dirname,
            '..',
            'packages/react-native-session-replay',
            sessionReplayPackage.source
          ),
        },
      },
    ],
  ],
  overrides: [{
    "plugins": [
      ["@babel/plugin-transform-private-methods", {
        "loose": true
      }]
    ]
  }]
};
