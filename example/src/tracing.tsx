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
        this.getHttp("http://testing-ft2x-api.cloudcare.cn/api/v1/account/permissions");
      }}
      /></View>
      </ScrollView>
      );
  }

  
  async getHttp(url:string){
    
    const fetchOptions = {
      method: 'GET',
      headers:{
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      } ,
    };
    
    fetch(url, fetchOptions).then((response:any)=>{
            if (response.ok) {
                return response.json();
            }
        }).then((json)=>{
            console.log(JSON.stringify(json));
        }).catch((error:any)=>{

            console.error(error.arrayBuffer());
        });

    
  }


}

export default TraceScreen;