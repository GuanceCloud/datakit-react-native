import * as React from 'react';
import type { NavigationContainerRef } from '@react-navigation/native';
import { View, Button, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  FTMobileReactNative,
  FTReactNativeLog,
  FTLogStatus,
} from '@cloudcare/react-native-mobile';
import Config from 'react-native-config';
import RUMScreen from './rum';
import LogScreen from './logging';
import TraceScreen from './tracing';
import WebViewScreen from './webView';
import LocalWebViewScreen from './localWebView';
import SessionReplayScreen from './sessionReplay';

import { FTRumReactNavigationTracking } from './FTRumReactNavigationTracking';
import AsyncStorage from '@react-native-async-storage/async-storage'

function Home() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="HomeScreen" component={HomeScreen} options={{ title: 'react-navigation' }} />
      <Tab.Screen name="Messages" component={Messages} options={{ title: 'Message' }} />
      <Tab.Screen name="Mine" component={Mine} options={{ title: 'Mine' }} />

    </Tab.Navigator>
  );
}

class HomeScreen extends React.Component<{ navigation: any }> {
 

  private onUpdateRemoteConfig = async () => {
    try {
      const result = await FTMobileReactNative.updateRemoteConfig();
      console.log('manual remote config result', result);
    } catch (error) {
      console.log('manual remote config error', error);
    }
  };

  private onUpdateRemoteConfigWithMiniInterval = async () => {
    try {
      const result = await FTMobileReactNative.updateRemoteConfigWithMiniUpdateInterval(0);
      console.log('manual remote config with interval result', result);
    } catch (error) {
      console.log('manual remote config with interval error', error);
    }
  };

  private onSetDatakitURL = async () => {
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

  private onSetDatawayURL = async () => {
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

  render() {
    let { navigation } = this.props;
    FTReactNativeLog.logging("react-navigation HomeScreen render", FTLogStatus.info);

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
        {renderButton('Set Datakit URL', this.onSetDatakitURL)}
        {renderButton('Set Dataway URL', this.onSetDatawayURL)}
        {renderButton('Shutdown SDK', () => FTMobileReactNative.shutDown())}
        {renderButton('Clear SDK Cache', () => FTMobileReactNative.clearAllData())}

        {renderSectionTitle('Global Context')}
        {renderButton('Append Global Context', () => {
          FTMobileReactNative.appendGlobalContext({ 'global_key': 'global_value' });
          FTMobileReactNative.appendLogGlobalContext({ 'log_key': 'log_value' });
          FTMobileReactNative.appendRUMGlobalContext({ 'rum_key': 'rum_value' });
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
        {renderButton('Update Remote Config', this.onUpdateRemoteConfig)}
        {renderButton('Update Remote Config With Mini Interval', this.onUpdateRemoteConfigWithMiniInterval)}

        {renderSectionTitle('Features')}
        {renderButton('Log Output', () => navigation.navigate('Log'))}
        {renderButton('Network Trace', () => navigation.navigate('Trace'))}
        {renderButton('RUM Data Collection', () => navigation.navigate('RUM'))}
        {renderButton('WebView', () => navigation.navigate('WebView'))}
        {renderButton('Local WebView', () => navigation.navigate('LocalWebView'))}
        {renderButton('Session Replay', () => navigation.navigate('SessionReplay'))}
      </ScrollView>
    );
  }
}
class Messages extends React.Component<{ navigation: any }> {
  render() {
    let { navigation } = this.props;
    return (
      <View style={{ flex: 1, alignItems: 'center', padding: 20 }}>
        <Button title='MessagesDetail' onPress={() => navigation.navigate('Detail')} />

      </View>
    );
  }
}
class Mine extends React.Component<{ navigation: any }> {
  render() {
    return (
      <View style={{ flex: 1, alignItems: 'center', padding: 20 }}>
        <Text>{"Mine"}</Text>

      </View>
    );
  }
}
class MessagesDetail extends React.Component<{ navigation: any }> {

  render() {
    return (
      <View style={{ flex: 1, alignItems: 'center', padding: 20 }}>
        <Text>{"message"}</Text>
      </View>
    );
  }
}


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navigationRef: React.RefObject<NavigationContainerRef<ReactNavigation.RootParamList>> = React.createRef();

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



function App() {
  return (
    // react-navigation
    // Enable RUM View collection
    // Drag the FTRumReactNavigationTracking.tsx file from example into your project;

    // Method 1: If you use createNativeStackNavigator(); to create native navigation stack, it's recommended to use <Stack.Navigator screenListeners={FTRumReactNavigationTracking.StackListener} initialRouteName='Home'> to enable collection,
    //         this way you can get page load duration statistics
    // Method 2: If you don't use createNativeStackNavigator(); you need to enable collection in the NavigationContainer component, as shown below

    <NavigationContainer ref={navigationRef} onReady={() => {
      // Method 2:
      // FTRumReactNavigationTracking.startTrackingViews(navigationRef.current);
    }}>
      {/*Method 1:*/}
      <Stack.Navigator screenListeners={FTRumReactNavigationTracking.StackListener} initialRouteName='Home'>
        <Stack.Screen name='Home' component={Home} options={{ headerShown: false }} />
        <Stack.Screen name='Trace' component={TraceScreen} options={{ title: 'Network Trace' }} />
        <Stack.Screen name='Log' component={LogScreen} options={{ title: 'Log Output' }} />
        <Stack.Screen name='RUM' component={RUMScreen} options={({ title: 'RUM Data Collection' })} />
        <Stack.Screen name='Detail' component={MessagesDetail} options={{ title: 'Detail' }} />
        <Stack.Screen name="Messages" component={Messages} options={{ title: 'Message' }} />
        <Stack.Screen name="Mine" component={Mine} options={{ title: 'Mine' }} />
        <Stack.Screen name="WebView" component={WebViewScreen} options={{ title: 'WebView' }} />
        <Stack.Screen name="LocalWebView" component={LocalWebViewScreen} options={{ title: 'LocalWebView' }} />
        <Stack.Screen name="SessionReplay" component={SessionReplayScreen} options={{ title: 'SessionReplay' }}/>

      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
