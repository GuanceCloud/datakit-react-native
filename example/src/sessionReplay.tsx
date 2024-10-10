import * as React from 'react';
import { SafeAreaView,TextInput,View,Text,Switch,Button} from 'react-native';
import { styles} from './utils';

class SessionReplayScreen extends React.Component {

static options() {
        return {
              topBar: {
                    title: {
                          text: "SessionReplay"
                    }
              }
        };
  }
  constructor(props) {
    super(props);
    this.state = { text: 'This is a TextInput',
      toggleSwitch: false
     };
    
  }
  render() {

    return (
        <SafeAreaView>
          <TextInput
            style={styles.input}
            onChangeText={(text) => this.setState({text})}
            value={this.state.text}
          />
          <Text style={styles.redText}>This is a Text</Text>
          <View  style={styles.srSwitchContainter}>
          <Text >This is a Switch</Text>
          <Switch style={styles.leftMargin}
           onValueChange={(toggleSwitch) => this.setState({toggleSwitch})}
           value={this.state.toggleSwitch}
          ></Switch>
          </View>
          <View  style={styles.srButtonContainter}>
          <Button title="This is a Button"
           onPress={()=>{
            console.log("Button pressed")
                 }}/>
          </View>
        </SafeAreaView>
      );
  }

}

  
  
export default SessionReplayScreen;