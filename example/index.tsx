import { AppRegistry } from 'react-native';
// import AsyncStorage from '@react-native-community/async-storage'
import App from './src/App';
import { startReactNativeNavigation } from './src/RNNApp';
import { name as appName, navigation as navigationLib } from './app.json';
import { Navigation } from 'react-native-navigation';
import {
  DetectFrequency,
  DeviceMetricsMonitorType,
  EnvType,
  ErrorMonitorType,
  FTLogConfig,
  FTLogStatus,
  FTMobileConfig,
  FTMobileReactNative,
  FTReactNativeLog,
  FTReactNativeRUM,
  FTReactNativeTrace,
  FTRUMConfig,
  FTTraceConfig,
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


async function initSDK() {
  //基础配置
  let config: FTMobileConfig = {
    datakitUrl:Config.SERVER_URL,
    debug: true,
    env:"prod",
    // envType:EnvType.prod,
    globalContext: { 'sdk_example': 'example1' },
  };
  await FTMobileReactNative.sdkConfig(config);

  // log 设置
  let logConfig: FTLogConfig = {
    enableCustomLog: true,
    enableLinkRumData: true,
    globalContext: { 'log_example': 'example2' },
  };
  await FTReactNativeLog.logConfig(logConfig);

  // trace 设置
  let traceConfig: FTTraceConfig = {
    enableLinkRUMData: true,
    enableNativeAutoTrace: true,
    traceType: TraceType.ddTrace,
  };
  await FTReactNativeTrace.setConfig(traceConfig);

  // rum 设置
  let rumConfig: FTRUMConfig = {
    androidAppId: Config.ANDROID_APP_ID,
    iOSAppId:Config.IOS_APP_ID,
    enableAutoTrackUserAction: true,
    enableAutoTrackError: true,
    enableNativeUserAction: true,
    enableNativeUserView: false,
    enableNativeUserResource: true,
    errorMonitorType:ErrorMonitorType.cpu | ErrorMonitorType.memory,
    deviceMonitorType:DeviceMetricsMonitorType.all,
    detectFrequency:DetectFrequency.rare
  };
  // 静态设置 globalContext
  //.env.dubug、.env.release 等配置的环境文件中设置
  rumConfig.globalContext = { 'track_id': Config.TRACK_ID };
  await FTReactNativeRUM.setConfig(rumConfig);
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
   */

  FTReactNativeLog.logging('config complete', FTLogStatus.info);
}
