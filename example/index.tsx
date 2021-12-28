import { AppRegistry, Platform } from 'react-native';
import App from './src/App';
import {startReactNativeNavigation} from './src/RNNApp';
import { name as appName } from './app.json';
import { Navigation } from 'react-native-navigation';
import { navigation as navigationLib } from './app.json';
import {
  FTMobileReactNative,
  FTReactNativeLog,
  FTReactNativeTrace,
  FTReactNativeRUM,
  FTMobileConfig,
  FTLogConfig,
  FTTractConfig,
  FTRUMConfig,
  MonitorType,
} from '@cloudcare/react-native-mobile';
import Config from 'react-native-config';

console.log('navigationLib library: ' + navigationLib);
if(navigationLib == "react-navigation"){
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
}else if(navigationLib == "react-native-navigation"){
  initSDK();
  startReactNativeNavigation();
}

function initSDK() {
  let config: FTMobileConfig = {
    serverUrl: Config.SERVER_URL,
    debug: true,
  };
  FTMobileReactNative.sdkConfig(config).then(() => {
    let logConfig: FTLogConfig = {
      enableCustomLog: true,
      enableLinkRumData: true,
    };
    return FTReactNativeLog.logConfig(logConfig);
  }).then(() => {
    let traceConfig: FTTractConfig = {
      enableNativeAutoTrace: false,
    };
    return FTReactNativeTrace.setConfig(traceConfig);
  }).then(() => {
    let rumid = String(Platform.OS === 'ios' ? Config.IOS_APP_ID : Config.ANDROID_APP_ID);
    console.log(rumid);
    let rumConfig: FTRUMConfig = {
      rumAppId: rumid,
      monitorType: MonitorType.all,
      enableNativeUserAction: false,
      enableNativeUserResource: false,
      enableNativeUserView: false,
    };
    return FTReactNativeRUM.setConfig(rumConfig);

  }).then(() => {
    console.log('config complete');
  });
}
