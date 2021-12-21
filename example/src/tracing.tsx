import * as React from 'react';
import { ScrollView,StyleSheet,View, Button } from 'react-native';
import { FTReactNativeTrace} from 'react-native-ft-mobile-agent';
class TraceScreen extends React.Component<{ navigation: any }> {
       static navigationOptions = {
    title: '网络链路追踪',
  };

  render() {
    return (
      <ScrollView style={styles.container} contentOffset={{x:0,y:50}}>
      <View style={styles.list}>
      <Button 
      title="网络链路追踪"
      onPress={() => {
        Util.get("http://baidu.com",()=>{

        });

      }}
      /></View>
      </ScrollView>
      );
  }
}
const styles = StyleSheet.create({
  container:{
    backgroundColor:"#ffffff",
    marginTop: 0
  },
  list:{
    height:50,
    paddingLeft:20,
    justifyContent:"center",
    borderBottomColor:"#aaa",
    borderBottomWidth:0.2,
    alignItems:"baseline",
  }
});

const Util = {

async get(url,callback){
    const traceHeader =await FTReactNativeTrace.getTraceHeader("",url);
    
    const fetchOptions = {
      method: 'GET',
      headers:Object.assign({
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },traceHeader) ,
    };
    
    fetch(url, fetchOptions)
    .then((response) => {
      return response.json() 
    })
    .then((responseData) => {
      callback(responseData);
    })
    .catch((error)=>{
      
    });
  },
}
export default TraceScreen;