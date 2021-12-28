import React from 'react';
import { View, Button,ComponentProvider } from 'react-native';
import { Navigation } from 'react-native-navigation';
import { FTMobileReactNative} from '@cloudcare/react-native-mobile';
import RUMScreen from './rum';
import LogScreen from './logging';
import TraceScreen from './tracing';

function startReactNativeNavigation() {
  registerScreens();
  Navigation.events().registerAppLaunchedListener(async () => {
    console.log('ComponentProvider later');
    Navigation.setRoot({
      root: {
        stack: {
          children: [
          { component: { name: 'Home' } }
          ]
        }
      }
    });
  });
}

function registerScreens() {
 var component:ComponentProvider = Navigation.registerComponent('Home', () => HomeScreen);
 console.log('ComponentProvider ' + component.name);
  Navigation.registerComponent('RUM', () => RUMScreen);
  Navigation.registerComponent('Logger', () => LogScreen);
  Navigation.registerComponent('Trace', () => TraceScreen);
} 


const HomeScreen = (props) => {
  return (
    <View style={{
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'whitesmoke'
    }}>
    <Button title="绑定用户" onPress={() => FTMobileReactNative.bindRUMUserData("react-native-user")}/>
    <Button title="解绑用户" onPress={() => FTMobileReactNative.unbindRUMUserData()}/>
    <Button title="日志输出" onPress={() => Navigation.push(props.componentId,{ component: { name: 'Logger' } })}/>
    <Button title="网络链路追踪" onPress={() => Navigation.push(props.componentId,{ component: { name: 'Trace' } })}/>
    <Button title="RUM数据采集" onPress={() => Navigation.push(props.componentId,{ component: { name: 'RUM' } })}/>
    </View>
    );
};
HomeScreen.options = {
  topBar: {
    title: {
      text: 'Home',
      color: 'white'
    },
    background: {
      color: '#4d089a'
    }
  }
}

export {startReactNativeNavigation}