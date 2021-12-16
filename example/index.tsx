import { AppRegistry } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import { Navigation } from 'react-native-navigation';
import { navigation as navigationLib } from './app.json';
import { FTMobileReactNative } from 'react-native-ft-mobile-agent';
import Config from 'react-native-config';

console.log('navigationLib library: ' + navigationLib);

initSDK();
AppRegistry.registerComponent(appName, () => App);

Navigation.events().registerAppLaunchedListener(() => {
  Navigation.setRoot({
    root: {
      stack: {
        options: {
          topBar: {
            visible: false,
          },
        },
        children: [
          {
            component: {
              name: appName,
            },
          },
        ],
      },
    },
  });
});

function initSDK() {
  console.log(Config.IOS_APP_ID);
  FTMobileReactNative.sdkConfig(Config.SERVER_URL);
}
