import React from 'react';
import { Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Navigation } from 'react-native-navigation';
import {
  FTMobileReactNative,
} from '@cloudcare/react-native-mobile';
import Config from 'react-native-config';
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
            userid:{ contains : current_user_id }
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

  const onSetDatakitURL = async () => {
    const datakitUrl = Config.SERVER_URL;
    if (!datakitUrl) {
      console.log('set Datakit URL skipped: SERVER_URL is empty');
      return;
    }
    try {
      await FTMobileReactNative.setDatakitURL(datakitUrl);
      console.log('set Datakit URL success', datakitUrl);
    } catch (error) {
      console.log('set Datakit URL error', error);
    }
  };

  const onSetDatawayURL = async () => {
    const datawayUrl = Config.DATAWAY_URL;
    const clientToken = Config.CLIENT_TOKEN;
    if (!datawayUrl || !clientToken) {
      console.log('set Dataway URL skipped: DATAWAY_URL or CLIENT_TOKEN is empty');
      return;
    }
    try {
      await FTMobileReactNative.setDatawayURL(datawayUrl, clientToken);
      console.log('set Dataway URL success', datawayUrl);
    } catch (error) {
      console.log('set Dataway URL error', error);
    }
  };

  const renderButton = (title: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        homeStyles.button,
        pressed && homeStyles.buttonPressed,
      ]}
    >
      <Text style={homeStyles.buttonText}>{title}</Text>
    </Pressable>
  );

  const renderSectionTitle = (title: string) => (
    <Text style={homeStyles.sectionTitle}>{title}</Text>
  );

  return (
    <ScrollView style={homeStyles.scrollView} contentContainerStyle={homeStyles.content}>
      {renderSectionTitle('User')}
      {renderButton('Bind User', () => FTMobileReactNative.bindRUMUserData('react-native-user'))}
      {renderButton('Unbind User', () => FTMobileReactNative.unbindRUMUserData())}

      {renderSectionTitle('SDK')}
      {renderButton('Flush Sync Data', () => FTMobileReactNative.flushSyncData())}
      {renderButton('Set Datakit URL', onSetDatakitURL)}
      {renderButton('Set Dataway URL', onSetDatawayURL)}
      {renderButton('Shutdown SDK', () => FTMobileReactNative.shutDown())}
      {renderButton('Clear SDK Cache', () => {
         FTMobileReactNative.clearAllData();
      })}

      {renderSectionTitle('Global Context')}
      {renderButton('Append Global Context', () => {
         FTMobileReactNative.appendGlobalContext({'global_key':'global_value'});
         FTMobileReactNative.appendLogGlobalContext({'log_key':'log_value'});
         FTMobileReactNative.appendRUMGlobalContext({'rum_key':'rum_value'});
      })}
      {renderButton('Write Runtime Context', () => {
          AsyncStorage.setItem("track_id", "dynamic_id", (error: any) => {
            if (error) {
              console.log('Storage failed: ' + error);
            } else {
              console.log('Storage successful');
            }
          })
        })}

      {renderSectionTitle('Remote Config')}
      {renderButton('Update Remote Config', onUpdateRemoteConfig)}
      {renderButton('Update Remote Config With Mini Interval', onUpdateRemoteConfigWithMiniInterval)}

      {renderSectionTitle('Features')}
      {renderButton('Log Output', () => Navigation.push(props.componentId, { component: { name: 'Logger' } }))}
      {renderButton('Network Trace', () => Navigation.push(props.componentId, { component: { name: 'Trace' } }))}
      {renderButton('RUM Data Collection', () => Navigation.push(props.componentId, { component: { name: 'RUM' } }))}
      {renderButton('WebView', () => Navigation.push(props.componentId, { component: { name: 'WebView' } }))}
      {renderButton('Local WebView', () => Navigation.push(props.componentId, { component: { name: 'LocalWebView' } }))}
      {renderButton('Session Replay', () => Navigation.push(props.componentId, { component: { name: 'SessionReplay' } }))}
    </ScrollView>
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

const homeStyles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: 'whitesmoke',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  sectionTitle: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 18,
    marginBottom: 8,
  },
  button: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  buttonPressed: {
    opacity: 0.72,
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export { startReactNativeNavigation };
