import React from 'react';
import { View, Button } from 'react-native';
import { Navigation } from 'react-native-navigation';
import {
  FTMobileReactNative,
  FTReactNativeLog,
  FTLogStatus,
  FTRemoteConfigResult,
} from '@cloudcare/react-native-mobile';
import RUMScreen from './rum';
import LogScreen from './logging';
import TraceScreen from './tracing';
import WebViewScreen from './webView';
import LocalWebViewScreen from './localWebView';
import { FTRumReactNativeNavigationTracking } from './FTRumReactNativeNavigationTracking';
import AsyncStorage from '@react-native-async-storage/async-storage'

function startReactNativeNavigation() {
  console.log("startReactNativeNavigation");
  // react-native-navigation 
  // Enable RUM View collection
  // Drag the FTRumReactNavigationTracking.tsx file from example into your project;
  // Call the FTRumReactNativeNavigationTracking.startTracking() method to enable collection, as shown below:
  FTRumReactNativeNavigationTracking.startTracking();
  registerScreens();
  Navigation.events().registerAppLaunchedListener( async () => {
    await Navigation.setRoot({
      root: {
        stack: {
          children: [
            { component: { name: 'Home' } },
          ],
        },
      },
    });
  });
}

function registerScreens() {
  console.log("registerScreens");

  Navigation.registerComponent('Home', () => HomeScreen);
  Navigation.registerComponent('RUM', () => RUMScreen);
  Navigation.registerComponent('Logger', () => LogScreen);
  Navigation.registerComponent('Trace', () => TraceScreen);
  Navigation.registerComponent('WebView', () => WebViewScreen);
  Navigation.registerComponent('LocalWebView', () => LocalWebViewScreen);
  console.log("registerScreens end");

}
const HomeScreen = (props) => {
 
  const onUpdateRemoteConfig = async () => {
    try {
      const result = await FTMobileReactNative.updateRemoteConfig();
      console.log('manual remote config result', result);
    } catch (error) {
      console.log('manual remote config error', error);
    }
  };
  /// MOCK userId for testing remote config rules with custom keys. 
  const current_user_id = 'test_user';
  const onUpdateRemoteConfigWithMiniInterval = async () => {
    try {
      const result = await FTMobileReactNative.updateRemoteConfigWithMiniUpdateInterval(0,[
        {
        id:'test_manual_rule',
        match:{
          customKeys:{
            userid:current_user_id
          }
        },
        override:{
          env:"test",
          serviceName:"test_service",
          autoSync:true,
          compressIntakeRequests:true,
          syncPageSize:5,
          syncSleepTime:10,
          rumSampleRate:1,
          rumSessionOnErrorSampleRate:1,
          rumEnableTraceUserAction:true,
          rumEnableTraceUserView:true,
          rumEnableTraceUserResource:true,
          rumEnableResourceHostIP:true,
          rumEnableTrackAppUIBlock:true,
          rumBlockDurationMs:500,
          rumEnableTrackAppCrash:true,
          rumEnableTrackAppANR:true,
          rumEnableTraceWebView:true,
          rumAllowWebViewHost:["www.example.com"],
          traceSampleRate:0.5,
          traceEnableAutoTrace:true,
          traceType:"all",
          logSampleRate:1,
          logLevelFilters:["info","warn"],
          logEnableCustomLog:true,
          logEnableConsoleLog:true,
        }
        }
      ]
      );
      console.log('manual remote config with interval and custom rules result ', result);
    } catch (error) {
      console.log('manual remote config with interval and custom rules error', error);
    }
  };

  return (
    <View style={{
      flex: 1,
      alignItems: 'center',
      backgroundColor: 'whitesmoke',
      padding: 20,
    }}>
      <Button title='Bind User' onPress={() => FTMobileReactNative.bindRUMUserData('react-native-user')} />
      <Button title='Unbind User' onPress={() => FTMobileReactNative.unbindRUMUserData()} />
      <Button title='Log Output' onPress={() => Navigation.push(props.componentId, { component: { name: 'Logger' } })} />
      <Button title='Network Trace' onPress={() => Navigation.push(props.componentId, { component: { name: 'Trace' } })} />
      <Button title='RUM Data Collection' onPress={() => Navigation.push(props.componentId, { component: { name: 'RUM' } })} />
      <Button title='Active Data Sync' onPress={() => FTMobileReactNative.flushSyncData()} />
      <Button title='WebView' onPress={() => Navigation.push(props.componentId, { component: { name: 'WebView' } })} />
      <Button title='Local WebView' onPress={() => Navigation.push(props.componentId, { component: { name: 'LocalWebView' } })} />
      <Button title='Shutdown SDK' onPress={() => FTMobileReactNative.shutDown()} />
      <Button title='Clear SDK Cache Data' onPress={() => {
         FTMobileReactNative.clearAllData();
      }} />
      <Button title='Dynamic GlobalContext Property Setting' onPress={() => {
         FTMobileReactNative.appendGlobalContext({'global_key':'global_value'});
         FTMobileReactNative.appendLogGlobalContext({'log_key':'log_value'});
         FTMobileReactNative.appendRUMGlobalContext({'rum_key':'rum_value'});
      }} />
      <Button title="Runtime File Read/Write GlobalContext Setting" onPress={() => {
          AsyncStorage.setItem("track_id", "dynamic_id", (error: any) => {
            if (error) {
              console.log('Storage failed: ' + error);
            } else {
              console.log('Storage successful');
            }
          })
        }}
        />
      <Button title='Update Remote Config' onPress={onUpdateRemoteConfig} />
      <Button title='Update Remote Config With Mini Update Interval' onPress={onUpdateRemoteConfigWithMiniInterval} />
    </View>
  );
};
HomeScreen.options = {
  topBar: {
    title: {
      text: 'react-native-navigation',
      color: 'white',
    },
    background: {
      color: '#4d089a',
    },
  },
};

export { startReactNativeNavigation };
