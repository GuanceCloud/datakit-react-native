import * as React from 'react';
import type { NavigationContainerRef } from '@react-navigation/native';
import { View, Button ,Text} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FTMobileReactNative,FTReactNativeLog,FTLogStatus } from '@cloudcare/react-native-mobile';
import Config from 'react-native-config';
import RUMScreen from './rum';
import LogScreen from './logging';
import TraceScreen from './tracing';
import LocalWebViewScreen from './localWebView';
//import WebViewScreen from './webView';
import { styles } from './utils';
import {FTRumReactNavigationTracking} from './FTRumReactNavigationTracking';

function Home() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="HomeScreen" component={HomeScreen} options={{ title: 'Home' }}/>
      <Tab.Screen name="Messages" component={Messages} options={{ title: 'Message' }}/>
      <Tab.Screen name="Mine" component={Mine} options={{ title: 'Mine' }}/>

    </Tab.Navigator>
  );
}

class HomeScreen extends React.Component<{ navigation: any }> {
  componentDidMount() {
    // FTMobileReactNative.bindRUMUserData('reactUser');
    console.log(Config.IOS_APP_ID);
    FTReactNativeLog.logging("react-navigation HomeScreen start",FTLogStatus.info);
  }

  render() {
    let { navigation } = this.props;
        FTReactNativeLog.logging("react-navigation HomeScreen render",FTLogStatus.info);

    return (
      <View style={{ flex: 1, alignItems: 'center', padding: 20 }}>
        <Button title='绑定用户' onPress={() => FTMobileReactNative.bindRUMUserData('react-native-user')} />
        <View  style={styles.space}/>
        <Button title='解绑用户' onPress={() => FTMobileReactNative.unbindRUMUserData()} />
        <View  style={styles.space}/>
        <Button title='日志输出' onPress={() => navigation.navigate('Log')} />
        <View  style={styles.space}/>
        <Button title='网络链路追踪' onPress={() => navigation.navigate('Trace')} />
        <View  style={styles.space}/>
        <Button title='RUM数据采集' onPress={() => navigation.navigate('RUM')} />
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
      <Stack.Navigator   screenListeners={FTRumReactNavigationTracking.StackListener} initialRouteName='Home'>
        <Stack.Screen name='Home' component={Home}  options={{ headerShown: false }} />
        <Stack.Screen name='Trace' component={TraceScreen} options={{ title: '网络链路追踪' }} />
        <Stack.Screen name='Log' component={LogScreen} options={{ title: '日志输出' }} />
        <Stack.Screen name='RUM' component={RUMScreen} options={({ title: 'RUM 数据采集' })} />
        <Stack.Screen name="LocalWebView" component={LocalWebViewScreen} />
        <Stack.Screen name='Deatil' component={MessagesDetail}/>
        <Stack.Screen name="Messages" component={Messages} options={{ title: 'Message' }}/>
        <Stack.Screen name="Mine" component={Mine} options={{ title: 'Mine' }}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
