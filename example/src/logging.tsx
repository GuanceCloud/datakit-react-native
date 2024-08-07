  import * as React from 'react';
  import { ScrollView,View,Button } from 'react-native';
  import { FTReactNativeLog,FTLogStatus} from '@cloudcare/react-native-mobile';
  import { styles} from './utils';

  class LogScreen extends React.Component{
    static options(props) {
      return {
        topBar: {
          title: {
            text: "日志输出"
          }
        }
      };
    }
    render() {

      return(
        <ScrollView style={styles.container} contentOffset={{x:0,y:50}}>
        <View  style={styles.list}>
        <Button title="Log Status: info" onPress={()=>{
          this.logging("info log content",FTLogStatus.info);

        }
      }/>

      </View>
      <View  style={styles.list}>
      <Button title="Log Status: warning" onPress={()=>{
        this.logging("warning log content",FTLogStatus.warning);
      }}/>

      </View>
      <View  style={styles.list}>
      <Button title="Log Status: error"
      onPress={()=>{
        this.logging("error log content",FTLogStatus.error);
      }}/>

      </View>
      <View  style={styles.list}>
      <Button title="Log Status: critical" onPress={()=>{
        this.logging("critical log content",FTLogStatus.critical);
      }}/>

      </View>
      <View  style={styles.list}>
      <Button title="Log Status: ok" onPress={()=>{
        this.logging("ok log content",FTLogStatus.ok);
      }}/>

      </View>
      <View  style={styles.list}>
      <Button title="Log Status: custom (string status)" onPress={()=>{
        this.logging("custom log content","custom");
      }}/>

      </View>
      </ScrollView>
      )
    }

    logging(message:string,status:FTLogStatus|string){
      FTReactNativeLog.logging(message,status,{"logging_property":"rn_demo"});
    }
  }

  export default LogScreen;