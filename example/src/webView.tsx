import * as React from 'react';
import { View ,Alert} from 'react-native';
import Config from 'react-native-config';
import { WebView } from 'react-native-webview';

class WebViewScreen extends React.Component {
      static options() {
            return {
                  topBar: {
                        title: {
                              text: "WebView"
                        }
                  }
            };         
      }      
      render() {
            const url = Config.WEBVIEW_URL+"?requestUrl="+Config.WEBVIEW_URL+"/api/user"
            return (
                  <View style = {{ flex: 1 }}>
                   <WebView
                   source={{uri:url}}
                   onMessage={this.onWebViewMessage}/>
                  </View>
                );          
      }
      onWebViewMessage = (event:any) => {
         let message = event.nativeEvent.data
          Alert.alert(message, '', [{
                text: 'OK',
                onPress: () => console.log('Cancel Pressed'),
                style: 'cancel',
          }
          ]);
       }
}
export default WebViewScreen;
