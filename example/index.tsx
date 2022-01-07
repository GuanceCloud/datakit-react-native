import { AppRegistry, Platform ,AsyncStorage} from 'react-native';
// import {AsyncStorage} from '@react-native-community/async-storage'
import { NativeModules } from 'react-native';
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
      enableTrackUserAction:true,
      enableTrackUserResource:true,
      enableTrackError:true,
      enableNativeUserAction: false,
      enableNativeUserResource: false,
      enableNativeUserView: false,
    };
    // 静态设置 globalContext
    let nativeContext =  NativeModules.FTGlobalContext;
    return new Promise(function(resolve) {
      nativeContext.getGlobalContext((error:any,context:object)=>{
        if (error) {
          console.error(error);
        } else if(context != null){
          rumConfig.globalContext = context;
        }
        resolve(FTReactNativeRUM.setConfig(rumConfig)); 
      });
    })
    /** 动态设置 globalContext
      return new Promise(function(resolve) {
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

  }).then(() => {
    console.log('config complete');
  });
}
