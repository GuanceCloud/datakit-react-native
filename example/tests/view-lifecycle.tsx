// Runtime smoke entry. Use a local collector; never loads the example's remote config.
import React, {useEffect} from 'react';
import {AppState, Platform, Text, View} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {FTMobileReactNative, FTReactNativeRUM, FTRumViewTracking} from '@cloudcare/react-native-mobile';
const endpoint = 'http://127.0.0.1:8765';
const platform = Platform.OS;
const marker = (event: string, extra = {}) => fetch(`${endpoint}/marker`, {
  method: 'POST', headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({platform, event, at: Date.now(), ...extra}),
}).catch(() => {});
const tracker = new FTRumViewTracking();
const stop = FTReactNativeRUM.stopView.bind(FTReactNativeRUM);
FTReactNativeRUM.stopView = property => {
  marker('JS_STOP_VIEW');
  return stop(property);
};
function Screen() {
  useEffect(() => {
    (async () => {
      await FTMobileReactNative.sdkConfig({datakitUrl: endpoint, debug: true, autoSync: true,
        compressIntakeRequests: false, globalContext: {runtime_view_test: platform}});
      await FTReactNativeRUM.setConfig({iOSAppId: 'runtime-view-test', androidAppId: 'runtime-view-test',
        sessionSamplingRate: 100, enableNativeUserView: false, enableNativeUserResource: false,
        enableNativeUserAction: false, enableAutoTrackUserAction: false, enableAutoTrackError: false});
      AppState.addEventListener('change', state => marker('APP_STATE', {state}));
      tracker.beginLoad('runtime-home');
      setTimeout(() => {
        tracker.show({key: 'runtime-home', name: `RuntimeAuto-${platform}`});
        marker('READY');
      }, 50);
      setInterval(() => FTMobileReactNative.flushSyncData(), 1000);
    })().catch(error => marker('ERROR', {message: String(error)}));
  }, []);
  return <View style={{flex: 1, justifyContent: 'center'}}><Text>Native automatic View lifecycle test</Text></View>;
}
Navigation.registerComponent('ViewLifecycleTest', () => Screen);
Navigation.events().registerAppLaunchedListener(() => {
  Navigation.setRoot({root: {component: {name: 'ViewLifecycleTest'}}});
});
