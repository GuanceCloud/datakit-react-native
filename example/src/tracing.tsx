import * as React from 'react';
import { ScrollView,View, Button } from 'react-native';
import { FTReactNativeTrace,FTTraceResource} from '@cloudcare/react-native-mobile';
import { Utils,styles} from './utils';
class TraceScreen extends React.Component<{ navigation: any }> {

  render() {
    return (
      <ScrollView style={styles.container} contentOffset={{x:0,y:50}}>
      <View style={styles.list}>
      <Button title="网络链路追踪" onPress={() => {
        this.getHttp("https://www.baidu.com");
      }}
      /></View>
      </ScrollView>
      );
  }

  
  async getHttp(url:string){
    const key = Utils.getUUID();
    const traceHeader =await FTReactNativeTrace.getTraceHeader(key,url);
    
    const fetchOptions = {
      method: 'GET',
      headers:Object.assign({
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },traceHeader) ,
    };
    var res : Response;
    var err : any;
    try{
      res = await fetch(url, fetchOptions);
    }catch(error){
      err = error;
    }finally{
      var resource:FTTraceResource = {
        httpMethod:fetchOptions.method,
        requestHeader:fetchOptions.headers,
      };
      if (res) {
        resource.responseHeader = res.headers;
        resource.statusCode = res.status;
      }
      if (err) {
        resource.errorMessage = err.toString();
      }
      FTReactNativeTrace.addTrace(key,resource);
    }
  }


}

export default TraceScreen;