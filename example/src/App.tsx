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
        <Button title='绑定用户' onPress={() => FTMobileReactNative.bindRUMUserData('react-native-user')} />
        <View style={styles.space} />
        <Button title='解绑用户' onPress={() => FTMobileReactNative.unbindRUMUserData()} />
        <View style={styles.space} />
        <Button title='日志输出' onPress={() => navigation.navigate('Log')} />
        <View style={styles.space} />
        <Button title='网络链路追踪' onPress={() => navigation.navigate('Trace')} />
        <View style={styles.space} />
        <Button title='RUM数据采集' onPress={() => navigation.navigate('RUM')} />
        <View style={styles.space} />
        <Button title='主动数据同步' onPress={() => FTMobileReactNative.flushSyncData()} />
        <View style={styles.space} />
        <Button title='WebView' onPress={() => navigation.navigate('WebView')} />
        <View style={styles.space} />
        <Button title='Local WebView' onPress={() => navigation.navigate('LocalWebView')} />
        <View style={styles.space} />
        <View style={styles.space} />
        <Button title='关闭 SDK' onPress={() => FTMobileReactNative.shutDown()} />
        <View style={styles.space} />
        <Button title='清理 SDK 缓存数据' onPress={() => FTMobileReactNative.clearAllData()} />
        <View style={styles.space} />
        <Button title='GlobalContext 属性动态设置' onPress={() => {
          FTMobileReactNative.appendGlobalContext({ 'global_key': 'global_value' });
          FTMobileReactNative.appendLogGlobalContext({ 'log_key': 'log_value' });
          FTMobileReactNative.appendRUMGlobalContext({ 'rum_key': 'rum_value' });
        }} />
        <View style={styles.space} />
        <Button title="运行时读写文件方式设置 GlobalContext " onPress={() => {
          AsyncStorage.setItem("track_id", "dynamic_id", (error: any) => {
            if (error) {
              console.log('存储失败' + error);
            } else {
              console.log('存储成功');
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
    // 开启 RUM View 采集
    // 将 example 中 FTRumReactNavigationTracking.tsx 文件拖入您的工程；

    // 方法一：如果有使用 createNativeStackNavigator(); 创建原生导航堆栈，建议采用 <Stack.Navigator screenListeners={FTRumReactNavigationTracking.StackListener} nitialRouteName='Home'>开启采集，
    //        这样可以统计到页面的加载时长
    // 方法二：如果没有使用 createNativeStackNavigator(); 要在 NavigationContainer 组件中进行开启采集，如下

    <NavigationContainer ref={navigationRef} onReady={() => {
      // 方法二：
      // FTRumReactNavigationTracking.startTrackingViews(navigationRef.current);
    }}>
      {/*方法一：*/}
      <Stack.Navigator screenListeners={FTRumReactNavigationTracking.StackListener} initialRouteName='Home'>
        <Stack.Screen name='Home' component={Home} options={{ headerShown: false }} />
        <Stack.Screen name='Trace' component={TraceScreen} options={{ title: '网络链路追踪' }} />
        <Stack.Screen name='Log' component={LogScreen} options={{ title: '日志输出' }} />
        <Stack.Screen name='RUM' component={RUMScreen} options={({ title: 'RUM 数据采集' })} />
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
