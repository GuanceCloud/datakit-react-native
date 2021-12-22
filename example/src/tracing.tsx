import * as React from 'react';
import { ScrollView,View, Button } from 'react-native';
import { FTReactNativeTrace,FTTraceResource} from 'react-native-ft-mobile-agent';
import { Utils,styles} from './utils';
class TraceScreen extends React.Component<{ navigation: any }> {

  render() {
    return (
      <ScrollView style={styles.container} contentOffset={{x:0,y:50}}>
      <View style={styles.list}>
      <Button title="网络链路追踪" onPress={() => {
        this.getHttp("https://www.baidu.com/s?cl=3&tn=baidutop10&fr=top1000&wd=%E5%90%84%E5%9C%B0%E8%B4%AF%E5%BD%BB%E5%8D%81%E4%B9%9D%E5%B1%8A%E5%85%AD%E4%B8%AD%E5%85%A8%E4%BC%9A%E7%B2%BE%E7%A5%9E%E7%BA%AA%E5%AE%9E&rsv_idx=2&rsv_dl=fyb_n_homepage&sa=fyb_n_homepage&hisfilter=1");
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
        key:key,
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
      FTReactNativeTrace.addTrace(resource);
    }
  }


}

export default TraceScreen;