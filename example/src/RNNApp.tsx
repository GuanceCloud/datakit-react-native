import React from 'react';
import { View, Button } from 'react-native';
import { Navigation } from 'react-native-navigation';
import { FTMobileReactNative, FTReactNativeLog, FTLogStatus } from '@cloudcare/react-native-mobile';
import RUMScreen from './rum';
import LogScreen from './logging';
import TraceScreen from './tracing';
import WebViewScreen from './webView';
import LocalWebViewScreen from './localWebView';
import { FTRumReactNativeNavigationTracking } from './FTRumReactNativeNavigationTracking';

function startReactNativeNavigation() {
  console.log("startReactNativeNavigation");
  // react-native-navigation 
  // 开启 RUM View 采集
  // 将 example 中 FTRumReactNavigationTracking.tsx 文件拖入您的工程；
  // 调用 FTRumReactNativeNavigationTracking.startTracking() 方法，开启采集，如下所示：
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
  FTReactNativeLog.logging('react-native-navigation HomeScreen start', FTLogStatus.info);
  console.log("HomeScreen");

  return (
    <View style={{
      flex: 1,
      alignItems: 'center',
      backgroundColor: 'whitesmoke',
      padding: 20,
    }}>
      <Button title='绑定用户' onPress={() => FTMobileReactNative.bindRUMUserData('react-native-user')} />
      <Button title='解绑用户' onPress={() => FTMobileReactNative.unbindRUMUserData()} />
      <Button title='日志输出' onPress={() => Navigation.push(props.componentId, { component: { name: 'Logger' } })} />
      <Button title='网络链路追踪' onPress={() => Navigation.push(props.componentId, { component: { name: 'Trace' } })} />
      <Button title='RUM数据采集' onPress={() => Navigation.push(props.componentId, { component: { name: 'RUM' } })} />
      <Button title='主动数据同步' onPress={() => FTMobileReactNative.flushSyncData()} />
      <Button title='WebView' onPress={() => Navigation.push(props.componentId, { component: { name: 'WebView' } })} />
      <Button title='LocalWebView' onPress={() => Navigation.push(props.componentId, { component: { name: 'LocalWebView' } })} />

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
