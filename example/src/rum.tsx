import * as React from 'react';
import { StyleSheet,View, Button,ScrollView } from 'react-native';
import { FTReactNativeRUM} from 'react-native-ft-mobile-agent';

class RUMScreen extends React.Component<{ navigation: any }> {
      render() {
            return (
                  <ScrollView style={styles.container} contentOffset={{x:0,y:50}}>
                  <View  style={styles.list}>
                  <Button
                  title="Action 点击"
                  onPress={()=>{
                        FTReactNativeRUM.startAction("","");
                  }}
                  /></View>
                  <View  style={styles.list}>
                  <Button
                  title="View Start"
                  onPress={()=>{
                        FTReactNativeRUM.statView("s","");
                  }}
                  /></View>
                  <View  style={styles.list}>

                  <Button
                  title="View Stop"
                  onPress={()=>{
                        FTReactNativeRUM.stopView();
                  }}
                  /></View>
                  <View  style={styles.list}>

                  <Button
                  title="Resource Normal"
                  onPress={()=>{

                  }}/></View>
                  <View  style={styles.list}>

                  <Button
                  title="Resource Error"
                  onPress={()=>{

                  }}/></View>
                  <View  style={styles.list}>

                  <Button
                  title="Add Error"
                  onPress={()=>{

                  }}/>
                  </View>
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
export default RUMScreen;
