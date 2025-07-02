import * as React from 'react';
import type { NavigationContainerRef } from '@react-navigation/native';
import { View, Button, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FTMobileReactNative, FTReactNativeLog, FTLogStatus } from '@cloudcare/react-native-mobile';
import Config from 'react-native-config';
import RUMScreen from './rum';
import LogScreen from './logging';
import TraceScreen from './tracing';
import WebViewScreen from './webView';
import LocalWebViewScreen from './localWebView';
import { styles } from './utils';
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
  componentDidMount() {
    // FTMobileReactNative.bindRUMUserData('reactUser');
    console.log(Config.IOS_APP_ID);
    FTReactNativeLog.logging("react-navigation HomeScreen start", FTLogStatus.info);
  }

  render() {
    let { navigation } = this.props;
    FTReactNativeLog.logging("react-navigation HomeScreen render", FTLogStatus.info);

    return (
      <View style={{ flex: 1, alignItems: 'center', padding: 20 }}>
        <Button title='Bind User' onPress={() => FTMobileReactNative.bindRUMUserData('react-native-user')} />
        <View style={styles.space} />
        <Button title='Unbind User' onPress={() => FTMobileReactNative.unbindRUMUserData()} />
        <View style={styles.space} />
        <Button title='Log Output' onPress={() => navigation.navigate('Log')} />
        <View style={styles.space} />
        <Button title='Network Trace' onPress={() => navigation.navigate('Trace')} />
        <View style={styles.space} />
        <Button title='RUM Data Collection' onPress={() => navigation.navigate('RUM')} />
        <View style={styles.space} />
        <Button title='Active Data Sync' onPress={() => FTMobileReactNative.flushSyncData()} />
        <View style={styles.space} />
        <Button title='WebView' onPress={() => navigation.navigate('WebView')} />
        <View style={styles.space} />
        <Button title='Local WebView' onPress={() => navigation.navigate('LocalWebView')} />
        <View style={styles.space} />
        <View style={styles.space} />
        <Button title='Shutdown SDK' onPress={() => FTMobileReactNative.shutDown()} />
        <View style={styles.space} />
        <Button title='Clear SDK Cache Data' onPress={() => FTMobileReactNative.clearAllData()} />
        <View style={styles.space} />
        <Button title='Dynamic GlobalContext Property Setting' onPress={() => {
          FTMobileReactNative.appendGlobalContext({ 'global_key': 'global_value' });
          FTMobileReactNative.appendLogGlobalContext({ 'log_key': 'log_value' });
          FTMobileReactNative.appendRUMGlobalContext({ 'rum_key': 'rum_value' });
        }} />
        <View style={styles.space} />
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
        <View style={styles.space} />
      </View>
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
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
