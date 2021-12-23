import { AppRegistry,Platform } from 'react-native';
import App from './src/App';
import { name as appName } from './app.json';
import { Navigation } from 'react-native-navigation';
import { navigation as navigationLib } from './app.json';
import { FTMobileReactNative,
  FTReactNativeLog,
  FTReactNativeTrace,
  FTReactNativeRUM,
  FTMobileConfig,
  FTLogConfig,
  FTTractConfig,
  FTRUMConfig,
  MonitorType,
} from 'react-native-ft-mobile-agent';
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

async function initSDK() {
  var config:FTMobileConfig ={
    serverUrl:Config.SERVER_URL,
    debug:true
  };
  await FTMobileReactNative.sdkConfig(config);
  var logConfig:FTLogConfig = {
    enableCustomLog:true,
    enableLinkRumData:true,
  }
  await FTReactNativeLog.logConfig(logConfig);
  var traceConfig:FTTractConfig = {
      enableNativeAutoTrace:false,
  };
  await FTReactNativeTrace.setConfig(traceConfig);
  var rumid = String(Platform.OS === 'ios' ? Config.IOS_APP_ID : Config.ANDROID_APP_ID);
  console.log(rumid);
  var rumConfig:FTRUMConfig = {
    rumAppId:rumid,
    monitorType:MonitorType.all,
    enableNativeUserAction:false,
    enableNativeUserResource:false,
    enableNativeUserView:false,
  }
  await FTReactNativeRUM.setConfig(rumConfig);
}
