import * as React from 'react';
import { ScrollView,View,Button } from 'react-native';
import { FTReactNativeLog,FTLogStatus} from '@cloudcare/react-native-mobile';
import { styles} from './utils';

class LogScreen extends React.Component<{ navigation: any }> {
   render() {

    return(
      <ScrollView style={styles.container} contentOffset={{x:0,y:50}}>
      <View  style={styles.list}>
      <Button title="Log Status: info" onPress={()=>{
        FTReactNativeLog.logging("info log content",FTLogStatus.info);
      }
      }/>

      </View>
      <View  style={styles.list}>
      <Button title="Log Status: warning" onPress={()=>{
           FTReactNativeLog.logging("warning log content",FTLogStatus.warning);
      }}/>

      </View>
      <View  style={styles.list}>
      <Button title="Log Status: error"
      onPress={()=>{
        FTReactNativeLog.logging("error log content",FTLogStatus.error);
      }}/>

      </View>
      <View  style={styles.list}>
      <Button title="Log Status: critical" onPress={()=>{
        FTReactNativeLog.logging("critical log content",FTLogStatus.critical);
      }}/>

      </View>
      <View  style={styles.list}>
      <Button title="Log Status: ok" onPress={()=>{
        FTReactNativeLog.logging("ok log content",FTLogStatus.ok);
      }}/>

      </View>
      </ScrollView>
      )
  }
}

export default LogScreen;