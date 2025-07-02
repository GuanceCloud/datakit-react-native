import * as React from 'react';
import { ScrollView,View, Pressable,Text } from 'react-native';
import { FTReactNativeTrace} from '@cloudcare/react-native-mobile';
import { styles} from './utils';
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
class TraceScreen extends React.Component {
  static options() {
    return {
      topBar: {
        title: {
          text: "Network Trace"
        }
      }
    };
  }
  render() {
    return (
      <ScrollView style={styles.container} contentOffset={{x:0,y:50}}>
      <PressableItem title="Network Trace" onPress={() => {
        this.getHttp("https://console-api.guance.com/not/found/");
      }}
      />
      </ScrollView>
      );
  }


  async getHttp(url:string){
    // When auto collection is not enabled, you can manually get the request headers needed for trace functionality
    var traceHeader = await FTReactNativeTrace.getTraceHeaderFields(url);
    const fetchOptions = {
      method: 'GET',
      headers:Object.assign({
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },traceHeader) ,
    };
    fetch(url, fetchOptions).then((response:any)=>{
            if (response.ok) {
                return response.json();
            }
        }).then((json)=>{
            console.log(JSON.stringify(json));
        }).catch((error:any)=>{

            console.error(error);
        });


  }


}

export default TraceScreen;
