import { StyleSheet } from 'react-native';


const Utils = {

    getUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
      });
    }

}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginTop: 0,
  },
  list: {
    height: 50,
    paddingLeft: 20,
    justifyContent: 'center',
    borderBottomColor: '#aaa',
    borderBottomWidth: 0.2,
    alignItems: 'baseline',
  },
  srSwitchContainter:{
    height: 50,
    paddingLeft: 10,
    paddingTop:12,
    justifyContent: 'flex-start',
    alignItems: 'baseline',
    flexDirection: "row",
  },
  srButtonContainter:{
    height: 50,
    paddingLeft: 10,
    paddingTop:12,
    justifyContent: 'flex-start',
    alignItems: 'baseline',
    marginTop:12,
  },
  space: {
    marginTop: 8,
  },
  input: {
      height: 40,
      margin: 12,
      borderWidth: 1,
      padding: 10,
  },
  redText: {
      marginLeft:12,
      color: 'red',
      fontSize: 20,
      fontWeight: 'bold',
  },
  leftMargin:{
      marginLeft:12
  },
});

export{Utils,styles}
