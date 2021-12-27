import * as React from 'react';

import { View, Button } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FTMobileReactNative } from '@cloudcare/react-native-mobile';
import Config from 'react-native-config';
import RUMScreen from './rum';
import LogScreen from './logging';
import TraceScreen from './tracing';
import { styles } from './utils';


class HomeScreen extends React.Component<{ navigation: any }> {
  componentDidMount() {
    // FTMobileReactNative.bindRUMUserData('reactUser');
    console.log(Config.IOS_APP_ID);
  }

  render() {
    let { navigation } = this.props;
    return (
      <View style={{ flex: 1, alignItems: 'center', padding: 20 }}>
        <Button title='绑定用户' onPress={() => FTMobileReactNative.bindRUMUserData('react-native-user')} />
        <View  style={styles.space}/>
        <Button title='解绑用户' onPress={() => FTMobileReactNative.unbindRUMUserData()} />
        <View  style={styles.space}/>
        <Button title='日志输出' onPress={() => navigation.push('Log')} />
        <View  style={styles.space}/>
        <Button title='网络链路追踪' onPress={() => navigation.push('Trace')} />
        <View  style={styles.space}/>
        <Button title='RUM数据采集' onPress={() => navigation.push('RUM')} />
      </View>
    );
  }
}


const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName='Home'>
        <Stack.Screen name='Home' component={HomeScreen} />
        <Stack.Screen name='Trace' component={TraceScreen} options={{ title: '网络链路追踪' }} />
        <Stack.Screen name='Log' component={LogScreen} options={{ title: '日志输出' }} />
        <Stack.Screen name='RUM' component={RUMScreen} options={({ title: 'RUM 数据采集' })} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
