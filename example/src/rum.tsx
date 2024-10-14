import * as React from 'react';
import { View, Button,ScrollView} from 'react-native';
import { FTReactNativeRUM,FTRUMResource} from '@cloudcare/react-native-mobile';
import { Utils,styles} from './utils';
class RUMScreen extends React.Component {
      static options() {
            return {
                  topBar: {
                        title: {
                              text: "RUM 数据采集"
                        }
                  }
            };
      }
      render() {
            // 未开启自动采集时，可以通过 api 手动采集
            return (
                  <ScrollView style={styles.container} contentOffset={{x:0,y:50}}>
                  <View  style={styles.list}>
                  <Button title="Action 点击" accessibilityLabel = "RUM Click" onPress={()=>{
                        console.log('Action 点击');
                        FTReactNativeRUM.startAction('actionName','actionType');
                  }}
                  /></View>
                  <View  style={styles.list}>
                  <Button title="View onCreateView" onPress={()=>{
                        FTReactNativeRUM.onCreateView("RUM",100000000);
                  }}
                  /></View>
                  <View  style={styles.list}>
                  <Button title="View Start" onPress={()=>{
                        FTReactNativeRUM.startView("RUM",{"startView_property":"rn_demo"});
                  }}
                  /></View>
                  <View  style={styles.list}>
                  <Button title="View Stop" onPress={()=>{
                        FTReactNativeRUM.stopView({"stopView_property":"rn_demo"});
                  }}
                  /></View>
                  <View  style={styles.list}>
                  <Button title="Resource Normal" onPress={()=>{
                        this.getHttp("https://www.baidu.com");
                  }}/></View>
                  <View  style={styles.list}>

                  <Button title="Resource Error"  onPress={()=>{
                        this.getHttp("https://console-api.guance.com/not/found/");

                  }}/></View>
                  <View  style={styles.list}>
                  <Button title="Add Error" onPress={()=>{
                        FTReactNativeRUM.addError("error stack","error message",{"error_property":"rn_demo"});
                  }}/>
                  </View>
                  <View  style={styles.list}>
                  <Button title="Add Error With Type" onPress={()=>{
                        FTReactNativeRUM.addErrorWithType("custom_error","error stack","error message");
                  }}/>
                  </View>
                  <View  style={styles.list}>
                  <Button title="Add Console Error" onPress={()=>{
                        console.error("Add Console Error");
                  }}/>
                  </View>
                  </ScrollView>
                  );
      }



      async getHttp(url:string){
            const key = Utils.getUUID();
            FTReactNativeRUM.startResource(key,{"startResource_property_demo":"rn_demo"});
            const fetchOptions = {
                  method: 'GET',
                  headers:{
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                  } ,
            };
            var res : Response|undefined ;
            try{
                  res = await fetch(url, fetchOptions);
            }finally{
                  var resource:FTRUMResource = {
                        url:url,
                        httpMethod:fetchOptions.method,
                        requestHeader:fetchOptions.headers,
                  };
                  if (res) {
                        var header:{[k:string]:any} = {};
                        res.headers.forEach((value:any, name:any)=>{
                          header[name] = value
                        });
                        resource.responseHeader = header;
                        resource.resourceStatus = res.status;
                        resource.responseBody = await res.text();
                  }
                  FTReactNativeRUM.stopResource(key,{"endResource_property_demo":"rn_demo"});
                  FTReactNativeRUM.addResource(key,resource);
            }
      }
}
export default RUMScreen;
