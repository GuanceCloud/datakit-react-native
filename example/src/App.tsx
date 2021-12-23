import * as React from 'react';

import { View, Button } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FTMobileReactNative} from 'react-native-ft-mobile-agent';
import Config from 'react-native-config';
import RUMScreen from './rum';
import LogScreen from './logging';
import TraceScreen from './tracing';


class HomeScreen extends React.Component<{ navigation: any }> {
  componentDidMount() {
    // FTMobileReactNative.bindRUMUserData('reactUser');
    console.log(Config.IOS_APP_ID);
  }

  render() {
    let { navigation } = this.props;
    return (
      <View style={{ flex: 1, alignItems:'center',padding:20}}>
      <Button title="绑定用户" onPress={() => FTMobileReactNative.bindRUMUserData("react-native-user")}/>
      <Button title="解绑用户" onPress={() => FTMobileReactNative.unbindRUMUserData()}/>
      <Button title="日志输出" onPress={() => navigation.push('Log')}/>
      <Button title="网络链路追踪" onPress={() => navigation.push('Trace')}/>
      <Button title="RUM数据采集" onPress={() => navigation.push('RUM')}/>
      </View>
      );
  }
}




const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
    <Stack.Navigator initialRouteName="Home">
    <Stack.Screen name="Home" component={HomeScreen}  />
    <Stack.Screen name="Trace" component={TraceScreen} options={{title: "网络链路追踪"}}/>
    <Stack.Screen name="Log" component={LogScreen} options={{title: "日志输出"}}/>
    <Stack.Screen name="RUM" component={RUMScreen} options={({title: "RUM 数据采集"})}/>
    </Stack.Navigator>
    </NavigationContainer>
    );
}

export default App;
