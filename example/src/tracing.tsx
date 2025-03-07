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
  static options(props) {
    return {
      topBar: {
        title: {
          text: "网络链路追踪"
        }
      }
    };
  }
  render() {
    return (
      <ScrollView style={styles.container} contentOffset={{x:0,y:50}}>
      <PressableItem title="网络链路追踪" onPress={() => {
        this.getHttp("https://console-api.guance.com/not/found/");
      }}
      />
      </ScrollView>
      );
  }


  async getHttp(url:string){
    // 未开启自动采集时，可以手动获取 trace 功能所需的请求头
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
