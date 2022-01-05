import * as React from 'react';
import { View, Button,ScrollView } from 'react-native';
import { FTReactNativeRUM,FTRUMResource} from '@cloudcare/react-native-mobile';
import { Utils,styles} from './utils';
class RUMScreen extends React.Component {
      static options(props) {
            return {
                  topBar: {
                        title: {
                              text: "RUM 数据采集"
                        }
                  }
            };         
      }      
      render() {
            return (
                  <ScrollView style={styles.container} contentOffset={{x:0,y:50}}>
                  <View  style={styles.list}>
                  <Button title="Action 点击" accessibilityLabel = "RUM Click" onPress={()=>{
                        console.log('Action 点击');
                  }}
                  /></View>
                  <View  style={styles.list}>
                  <Button title="View Start" onPress={()=>{
                        FTReactNativeRUM.startView("RUM","");
                  }}
                  /></View>
                  <View  style={styles.list}>
                  <Button title="View Stop" onPress={()=>{
                        FTReactNativeRUM.stopView();
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
                        FTReactNativeRUM.addError("error stack","error message");
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
            FTReactNativeRUM.startResource(key);
            const fetchOptions = {
                  method: 'GET',
                  headers:{
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                  } ,
            };
            var res : Response;
            try{
                  res = await fetch(url, fetchOptions);
            }finally{
                  var resource:FTRUMResource = {
                        url:url,
                        httpMethod:fetchOptions.method,
                        requestHeader:fetchOptions.headers,
                  };
                  if (res) {
                        resource.responseHeader = res.headers;
                        resource.resourceStatus = res.status;
                        resource.responseBody = await res.text();
                  }
                  FTReactNativeRUM.stopResource(key);
                  FTReactNativeRUM.addResource(key,resource);
            }
      }
}
export default RUMScreen;
