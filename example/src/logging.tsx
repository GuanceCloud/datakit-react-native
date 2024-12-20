import * as React from 'react';
import { ScrollView,Pressable,View ,Text} from 'react-native';
import { FTReactNativeLog, FTLogStatus } from '@cloudcare/react-native-mobile';
import { styles } from './utils';
// import {PressableItem} from './PressableItem'
function PressableItem(props: any) {
  return (
    <View style={styles.list}>
      <Pressable onPress={props.onPress}>
        {({ pressed }) => (
          <Text
            style={{ fontSize: 18, color: pressed ? 'gray' : '#007AFFFF' }}>{props.title}</Text>
        )}
      </Pressable></View>
  );
}
class LogScreen extends React.Component {
  static options() {
    return {
      topBar: {
        title: {
          text: "日志输出"
        }
      }
    };
  }
  render() {

    return (
      <ScrollView style={styles.container} contentOffset={{ x: 0, y: 50 }}>
        <PressableItem title="Log Status: info" onPress={() => {
          this.logging("info log content", FTLogStatus.info);
        }} />
        <PressableItem title="Log Status: warning" onPress={() => {
          this.logging("warning log content", FTLogStatus.warning);
        }} />
        <PressableItem title="Log Status: error"
          onPress={() => {
            this.logging("error log content", FTLogStatus.error);
        }} />
        <PressableItem title="Log Status: critical" onPress={() => {
          this.logging("critical log content", FTLogStatus.critical);
        }} />
        <PressableItem title="Log Status: ok" onPress={() => {
          this.logging("ok log content", FTLogStatus.ok);
        }} />
        <PressableItem title="Log Status: custom (string status)" onPress={() => {
          this.logging("custom log content", "custom");
        }} />

      </ScrollView>
    )
  }

  logging(message: string, status: FTLogStatus | string) {
    FTReactNativeLog.logging(message, status, { "logging_property": "rn_demo" });
  }
}

export default LogScreen;
