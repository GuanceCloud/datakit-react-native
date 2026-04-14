import * as React from 'react';
import {
  SafeAreaView,
  TextInput,
  View,
  Modal,
  Text,
  Switch,
  Button,
  Alert,
  TouchableHighlight,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { FTSessionReplayView } from '@cloudcare/react-native-session-replay';

import Slider from '@react-native-community/slider'
import { styles } from './utils';
const wait = (timeout: number) => {
  return new Promise(resolve => {
    setTimeout(resolve, timeout);
  });
}
interface FormData {
  username: string;
  email: string;
  password:string;
}
interface Item {
  id: number;
  name: string;
  description:string;
}
interface State {
  toggleSwitch: boolean;
  sliderValue: number;
  selectedLanguage: string;
  isLoading: boolean;
  pickerVisible: boolean;
  refreshing: boolean;
  formData: FormData;
  items: Item[];
}
class SessionReplayScreen extends React.Component<{}, State> {

  // Show Picker
  showPicker = () => {
    this.setState({ pickerVisible: true });
  };

  // Hide Picker
  hidePicker = () => {
    this.setState({ pickerVisible: false });
  };

  // Handle selection change
  handlePickerChange = (itemValue: string) => {
    this.setState({ selectedLanguage: itemValue });
  };

  static options() {
    return {
      topBar: {
        title: {
          text: "Session Replay"
        }
      }
    };
  }

  constructor(props: any) {
    super(props);
    this.state = {
      toggleSwitch: false,
      sliderValue: 0.5,
      selectedLanguage: 'en',
      isLoading: false,
      pickerVisible: false,
      refreshing: false,
      formData: {
        username: '',
        email: '',
        password: ''
      },
      items: [
        { id: 1, name: 'Item 1', description: 'This is the first item' },
        { id: 2, name: 'Item 2', description: 'This is the second item' },
        { id: 3, name: 'Item 3', description: 'This is the third item' }
      ]
    };
  }

  handleFormChange = (field: string, value: string) => {
    this.setState(prevState => ({
      formData: {
        ...prevState.formData,
        [field]: value
      }
    }));
  };

  handleSubmit = () => {
    this.setState({ isLoading: true });
    // Simulate API request
    setTimeout(() => {
      Alert.alert('Form Submitted', JSON.stringify(this.state.formData, null, 2));
      this.setState({ isLoading: false });
    }, 1500);
  };

  onRefresh = () => {
    this.setState({ refreshing: true });

    wait(2000).then(() => { this.setState({ refreshing: false }); });
  };

  render() {

    const { isLoading, selectedLanguage, items, formData, pickerVisible, refreshing } = this.state;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.scrollView} refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={this.onRefresh} />
        }>
          {/* Page Title */}
          <Text style={styles.pageTitle}>Session Replay Demo</Text>
        
          {/* Text Input Area */}
          <FTSessionReplayView.MaskAll nativeID='maskAll'>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Text</Text>
            <Text style={styles.paddedText}>This text has padding set.</Text>
            <Text style={styles.redText}>This is a red Text component</Text>
          </View>
          </FTSessionReplayView.MaskAll>
          {/* Switch and Slider Area */}
         
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Controls</Text>
            <FTSessionReplayView.MaskAll showTouch={true} nativeID='maskAll.showTouch'>
            <View style={styles.srSwitchContainter}>
              <Text>Toggle Switch: {this.state.toggleSwitch ? 'ON' : 'OFF'}</Text>
              <Switch
                style={styles.leftMargin}
                onValueChange={(toggleSwitch) => this.setState({ toggleSwitch })}
                value={this.state.toggleSwitch}
                trackColor={{ false: "#767577", true: "#81C784" }}
              />
            </View>
            </FTSessionReplayView.MaskAll>
              <View style={styles.sliderContainer}>
              <Text>Slider Value: {this.state.sliderValue.toFixed(2)}</Text>
               <FTSessionReplayView.Hide nativeID='hideView' >
              <Slider
                value={this.state.sliderValue}
                onValueChange={(value) => this.setState({ sliderValue: value })}
                minimumValue={0}
                maximumValue={1}
                step={0.01}
                minimumTrackTintColor="#2196F3"
                maximumTrackTintColor="#BDBDBD"
              />
              </FTSessionReplayView.Hide>
            </View>

          </View>

          {/* Picker Area */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Picker</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={this.showPicker}
            >
              <Text style={styles.buttonText}>Select Language</Text>
            </TouchableOpacity>
            <Modal
              visible={pickerVisible}
              animationType="slide"
              transparent={true}
              onRequestClose={this.hidePicker}
            >
              {/* Translucent Background Layer */}
              <View
                style={styles.modalOverlay}
              >
                {/* Picker Container - Fixed at the Bottom */}
                <View style={styles.pickerContainer}>
                  <Text style={styles.pickerTitle}>Choose a Language</Text>

                  {/* Key: Picker Wrapper to Fix Transparency Issue */}
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={selectedLanguage}
                      style={styles.picker}
                      onValueChange={this.handlePickerChange}
                      mode="dropdown"
                      // Option Style Setting to Ensure Opaqueness
                      itemStyle={styles.pickerItem}
                    >
                      <Picker.Item label="English" value="en" />
                      <Picker.Item label="Spanish" value="es" />
                      <Picker.Item label="French" value="fr" />
                      <Picker.Item label="German" value="de" />
                      <Picker.Item label="Chinese" value="zh" />
                      <Picker.Item label="Japanese" value="ja" />
                    </Picker>
                  </View>

                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={this.hidePicker}
                    >
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={this.hidePicker}
                    >
                      <Text style={styles.confirmText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
            <Text style={styles.selectedText}>
              Selected: {selectedLanguage.toUpperCase()}
            </Text>
          </View>

          {/* Button Area */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Buttons</Text>

            <View style={styles.srButtonContainter}>
              <Button
                title="Native Button"
                onPress={() => {
                  Alert.alert('Button pressed', 'Native Button was clicked')
                  console.log("Button pressed")
                }}
                color="#2196F3"
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                Alert.alert('TouchableOpacity', 'Custom button clicked')
                console.log('button click')
              }}
            >
              <Text style={styles.text}>Button with Border</Text>
            </TouchableOpacity>

            <TouchableHighlight
              style={[styles.button, styles.successButton]}
              onPress={this.handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.text}>Submit Form(TouchableHighlight)</Text>
              )}
            </TouchableHighlight>
          </View>

          {/* Form Area */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Sample Form</Text>

            <TextInput
              style={styles.input}
              placeholder="Username"
              value={formData.username}
              onChangeText={(value) => this.handleFormChange('username', value)}
            />

            <TextInput
              style={styles.input}
              placeholder="Email"
              keyboardType="email-address"
              value={formData.email}
              onChangeText={(value) => this.handleFormChange('email', value)}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              value={formData.password}
              onChangeText={(value) => this.handleFormChange('password', value)}
            />
          </View>

          {/* List Display Area */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Item List</Text>
            {items.map(item => (
              <View key={item.id} style={styles.listItem}>
                <Text style={styles.listItemTitle}>{item.name}</Text>
                <Text style={styles.listItemDescription}>{item.description}</Text>
              </View>
            ))}
          </View>

          {/* Image Display Area */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Image Example</Text>
            <View style={styles.imageContainer}>
              <Image
                style={styles.image}
                source={{ uri: 'https://picsum.photos/400/200' }}
                resizeMode="cover"
              />
              <Text style={styles.imageCaption}>Sample Image from URL</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
}

export default SessionReplayScreen;
