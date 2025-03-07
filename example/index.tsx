import { AppRegistry } from 'react-native';
//import AsyncStorage from '@react-native-async-storage/async-storage'
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
  FTDBCacheDiscard,
  FTRUMCacheDiscard,
  FTRumActionTracking,
  FTRumErrorTracking
} from '@cloudcare/react-native-mobile';
import Config from 'react-native-config';


console.log('navigationLib library: ' + navigationLib);

  //React Native 开发
reactNativeInitSDK();

//  //原生开发，部分页面或业务流程使用 React Native 实现
//  //在原生工程进行 SDK 的初始化，React Native 侧无需再进行初始化配置
//  //按需开启配置
// hybridConfig(); 

function hybridConfig(){
  //开启自动采集 react-native 控件点击
  FTRumActionTracking.startTracking();
  //开启自动采集 react-native Error
  FTRumErrorTracking.startTracking();
}

// SDK 初始化
async function reactNativeInitSDK() {
  //基础配置
  let config: FTMobileConfig = {
    datakitUrl:Config.SERVER_URL,
    debug: true,
    env:'test',
    enableLimitWithDbSize:true,
    dbCacheLimit:50*1024*1024,
    dbDiscardStrategy:FTDBCacheDiscard.discard,
    // envType:EnvType.prod,
    globalContext: { 'sdk_example': 'example1' },
  };
  await FTMobileReactNative.sdkConfig(config);

  // log 设置
  let logConfig: FTLogConfig = {
    enableCustomLog: true,
    enableLinkRumData: true,
    logCacheLimitCount: 2000,
    sampleRate:1,
    globalContext: { 'log_example': 'example2' },
  };
  await FTReactNativeLog.logConfig(logConfig);

  // trace 设置
  let traceConfig: FTTraceConfig = {
    enableLinkRUMData: true,
    enableNativeAutoTrace: true,
    sampleRate:1.0,
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
    sampleRate:1.0,
    enableNativeUserResource: true,
    enableResourceHostIP:true,
    enableTrackNativeAppANR:true,
    enableTrackNativeCrash:true,
    enableTrackNativeFreeze:true,
    errorMonitorType:ErrorMonitorType.cpu | ErrorMonitorType.memory,
    deviceMonitorType:DeviceMetricsMonitorType.all,
    detectFrequency:DetectFrequency.rare,
    rumCacheLimitCount:1000,
    rumDiscardStrategy:FTRUMCacheDiscard.discardOldest,
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


// 根据 app.json 中设置的 navigationLib 初始化对应导航组件，启动 APP
// 导航组件使用 react-navigation
if (navigationLib == 'react-navigation') {
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
  // 导航组件使用 react-native-navigation
  startReactNativeNavigation();
}