import React from 'react';
import { View, Button } from 'react-native';
import { Navigation } from 'react-native-navigation';
import { FTMobileReactNative, FTReactNativeLog, FTLogStatus } from '@cloudcare/react-native-mobile';
import RUMScreen from './rum';
import LogScreen from './logging';
import TraceScreen from './tracing';
import WebViewScreen from './webView';
import LocalWebViewScreen from './localWebView';
import SessionReplayScreen from './sessionReplay';
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
  Navigation.registerComponent('SessionReplay', () => SessionReplayScreen);
  console.log("registerScreens end");

}


const HomeScreen = (props) => {
  FTReactNativeLog.logging('react-native-navigation HomeScreen start', FTLogStatus.info);
  console.log("HomeScreen");

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
      <Button title='SessionReplay' onPress={() => Navigation.push(props.componentId, { component: { name: 'SessionReplay' } })} />
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
