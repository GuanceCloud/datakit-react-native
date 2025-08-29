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

  //React Native development
reactNativeInitSDK();

//  //Native development, some pages or business processes use React Native implementation
//  //Initialize SDK in native project, no need to initialize configuration on React Native side
//  //Enable configuration as needed
// hybridConfig();

function hybridConfig(){
  //Enable automatic collection of react-native control clicks
  FTRumActionTracking.startTracking();
  //Enable automatic collection of react-native Error
  FTRumErrorTracking.startTracking();
}

// SDK initialization
async function reactNativeInitSDK() {
  //Basic configuration
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

  // log settings
  let logConfig: FTLogConfig = {
    enableCustomLog: true,
    enableLinkRumData: true,
    logCacheLimitCount: 2000,
    sampleRate:1,
    globalContext: { 'log_example': 'example2' },
  };
  await FTReactNativeLog.logConfig(logConfig);

  // trace settings
  let traceConfig: FTTraceConfig = {
    enableLinkRUMData: true,
    enableNativeAutoTrace: true,
    sampleRate:1.0,
    traceType: TraceType.ddTrace,
  };
  await FTReactNativeTrace.setConfig(traceConfig);
  await FTMobileReactNative.appendBridgeContext({"wgt_id":"widget_id"});

  // rum settings
  let rumConfig: FTRUMConfig = {
    androidAppId: Config.ANDROID_APP_ID,
    iOSAppId:Config.IOS_APP_ID,
    enableAutoTrackUserAction: true,
    enableAutoTrackError: true,
    enableNativeUserAction: true,
    enableNativeUserView: false,
    sampleRate:1,
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
  // Static globalContext setting
  //Set in environment files like .env.debug, .env.release, etc.
  rumConfig.globalContext = { 'track_id': Config.TRACK_ID };
  await FTReactNativeRUM.setConfig(rumConfig);
  /** Dynamic globalContext setting
   new Promise(function(resolve) {
       AsyncStorage.getItem("track_id",(error,result)=>{
        if (result === null){
          console.log('Get failed: ' + error);
        }else {
          console.log('Get successful: ' + result);
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


// Initialize corresponding navigation component based on navigationLib set in app.json, start APP
// Navigation component uses react-navigation
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
  // Navigation component uses react-native-navigation
  startReactNativeNavigation();
}
