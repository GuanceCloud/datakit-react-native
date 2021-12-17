import * as React from 'react';

import { View, Text, Button } from 'react-native';
// import {
//   FTMobileReactNative,
//   // FTReactNativeTrace,
//   // FTReactNativeRUM,
//   // FTReactNativeLog,
// } from 'react-native-mobile';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Config from 'react-native-config';

class HomeScreen extends React.Component<{ navigation: any }> {
  componentDidMount() {
    // FTMobileReactNative.bindRUMUserData('reactUser');
    console.log(Config.IOS_APP_ID);
  }

  render() {
    let { navigation } = this.props;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Home Screen</Text>
        <Button
          title="Go to Details"
          onPress={() => navigation.navigate('Details')}
        />
      </View>
    );
  }
}

class DetailsScreen extends React.Component<{ navigation: any }> {
  render() {
    let { navigation } = this.props;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Details Screen</Text>
        <Button
          title="Go to Details... again"
          onPress={() => navigation.push('Details')}
        />
      </View>
    );
  }
}

const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
