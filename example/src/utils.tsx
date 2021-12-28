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
  space: {
    marginTop: 8,
  },
});

export{Utils,styles}
