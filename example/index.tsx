import { AppRegistry, Platform } from 'react-native';
// import AsyncStorage from '@react-native-community/async-storage'
import App from './src/App';
import { startReactNativeNavigation } from './src/RNNApp';
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
  FTTraceConfig,
  FTRUMConfig,
  MonitorType,
  TraceType,
} from '@cloudcare/react-native-mobile';
import Config from 'react-native-config';

console.log('navigationLib library: ' + navigationLib);
if (navigationLib == 'react-navigation') {
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
} else if (navigationLib == 'react-native-navigation') {
  initSDK();
  startReactNativeNavigation();
}

function initSDK() {
  let config: FTMobileConfig = {
    serverUrl: Config.SERVER_URL,
    debug: true,
    globalContext: { 'sdk_example': 'example1' },
  };
  FTMobileReactNative.sdkConfig(config);

  let logConfig: FTLogConfig = {
    enableCustomLog: true,
    enableLinkRumData: true,
    globalContext: { 'log_example': 'example2' },
  };
  FTReactNativeLog.logConfig(logConfig);


  let traceConfig: FTTraceConfig = {
    enableLinkRUMData: true,
    enableNativeAutoTrace: false,
    traceType: TraceType.ddTrace,
  };
  traceConfig.enableAutoTrace = Platform.OS === 'ios' ? false : true;
  FTReactNativeTrace.setConfig(traceConfig);

  let rumid = String(Platform.OS === 'ios' ? Config.IOS_APP_ID : Config.ANDROID_APP_ID);
  console.log(rumid);
  let rumConfig: FTRUMConfig = {
    rumAppId: rumid,
    monitorType: MonitorType.all,
    enableAutoTrackUserAction: true,
    enableAutoTrackError: true,
    enableNativeUserAction: true,
    enableNativeUserView: false,
    enableNativeUserResource: true,
  };
  rumConfig.enableAutoTrackUserResource = Platform.OS === 'ios' ? false : true;
  // 静态设置 globalContext
  //.env.dubug、.env.release 等配置的环境文件中设置
  rumConfig.globalContext = { 'track_id': Config.TRACK_ID };
  FTReactNativeRUM.setConfig(rumConfig);
  /** 动态设置 globalContext
    new Promise(function(resolve) {
       AsyncStorage.getItem("track_id",(error,result)=>{
        if (result === null){
          console.log('获取失败' + error);
        }else {
          console.log('获取成功' + result);
          if( result != undefined){
            rumConfig.globalContext = {"track_id":result};
          }
        }
        resolve(FTReactNativeRUM.setConfig(rumConfig));
      })
     })
   * */
}
