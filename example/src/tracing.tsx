import * as React from 'react';
import { ScrollView,View, Button } from 'react-native';
import { FTReactNativeTrace} from '@cloudcare/react-native-mobile';
import { Utils,styles} from './utils';
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
      <View style={styles.list}>
      <Button title="网络链路追踪" onPress={() => {
        this.getHttp("https://console-api.guance.com/not/found/");
      }}
      /></View>
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