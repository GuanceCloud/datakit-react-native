import * as React from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableHighlight,
  TouchableOpacity,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import {Picker} from '@react-native-picker/picker';
import {
  FTSessionReplayView,
  ImagePrivacyLevel,
  TextAndInputPrivacyLevel,
  TouchPrivacyLevel,
} from '@cloudcare/react-native-session-replay';

const wait = (timeout: number) => {
  return new Promise(resolve => {
    setTimeout(resolve, timeout);
  });
};

interface FormData {
  username: string;
  email: string;
  password: string;
}

interface Item {
  id: number;
  name: string;
  description: string;
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
  static options() {
    return {
      topBar: {
        title: {
          text: 'Session Replay',
        },
      },
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
        password: '',
      },
      items: [
        {id: 1, name: 'Item 1', description: 'This is the first item'},
        {id: 2, name: 'Item 2', description: 'This is the second item'},
        {id: 3, name: 'Item 3', description: 'This is the third item'},
      ],
    };
  }

  showPicker = () => {
    this.setState({pickerVisible: true});
  };

  hidePicker = () => {
    this.setState({pickerVisible: false});
  };

  handlePickerChange = (itemValue: string) => {
    this.setState({selectedLanguage: itemValue});
  };

  handleFormChange = (field: keyof FormData, value: string) => {
    this.setState(prevState => ({
      formData: {
        ...prevState.formData,
        [field]: value,
      },
    }));
  };

  handleSubmit = () => {
    this.setState({isLoading: true});
    setTimeout(() => {
      Alert.alert(
        'Form Submitted',
        JSON.stringify(this.state.formData, null, 2),
      );
      this.setState({isLoading: false});
    }, 1500);
  };

  onRefresh = () => {
    this.setState({refreshing: true});
    wait(1200).then(() => {
      this.setState({refreshing: false});
    });
  };

  renderExampleLabel = (title: string, description: string) => (
    <View style={pageStyles.exampleHeader}>
      <Text style={pageStyles.exampleTitle}>{title}</Text>
      <Text style={pageStyles.exampleDescription}>{description}</Text>
    </View>
  );

  renderPrivacyExamples() {
    return (
      <View style={pageStyles.section}>
        <Text style={pageStyles.sectionTitle}>
          FTSessionReplayView Examples
        </Text>
    
        <FTSessionReplayView.MaskAll
          showTouch={false}
          nativeID="sessionReplay.maskAll"
          style={[pageStyles.exampleBox, pageStyles.maskAllBox]}>
          {this.renderExampleLabel(
            'FTSessionReplayView.MaskAll',
            'Text, inputs, and images are handled with the Mask All strategy.',
          )}
          <Text style={pageStyles.bodyText}>
            Sensitive text: user@example.com
          </Text>
          <TextInput
            style={pageStyles.input}
            placeholder="Masked input"
            defaultValue="188-0000-0000"
          />
        </FTSessionReplayView.MaskAll>

        <FTSessionReplayView.MaskAll
          showTouch={true}
          nativeID="sessionReplay.maskAll.showTouch"
          style={[pageStyles.exampleBox, pageStyles.showTouchBox]}>
          {this.renderExampleLabel(
            'FTSessionReplayView.MaskAll showTouch',
            'Content is masked, while touch interactions remain visible.',
          )}
          <View style={pageStyles.rowBetween}>
            <Text style={pageStyles.bodyText}>
              Toggle Switch: {this.state.toggleSwitch ? 'ON' : 'OFF'}
            </Text>
            <Switch
              onValueChange={toggleSwitch => this.setState({toggleSwitch})}
              value={this.state.toggleSwitch}
              trackColor={{false: '#8a8f98', true: '#22c55e'}}
            />
          </View>
        </FTSessionReplayView.MaskAll>

        <FTSessionReplayView.MaskNone
          nativeID="sessionReplay.maskNone"
          style={[pageStyles.exampleBox, pageStyles.maskNoneBox]}>
          {this.renderExampleLabel(
            'FTSessionReplayView.MaskNone',
            'Non-sensitive content can be displayed as-is for replay checks.',
          )}
          <Text style={pageStyles.bodyText}>Public display text</Text>
          <Image
            style={pageStyles.inlineImage}
            source={{uri: 'https://picsum.photos/420/180'}}
            resizeMode="cover"
          />
        </FTSessionReplayView.MaskNone>

        <FTSessionReplayView.Privacy
          nativeID="sessionReplay.privacy.custom"
          textAndInputPrivacy={TextAndInputPrivacyLevel.MASK_SENSITIVE_INPUTS}
          imagePrivacy={ImagePrivacyLevel.MASK_NONE}
          touchPrivacy={TouchPrivacyLevel.SHOW}
          style={[pageStyles.exampleBox, pageStyles.privacyBox]}>
          {this.renderExampleLabel(
            'FTSessionReplayView.Privacy',
            'Custom text, image, and touch privacy levels.',
          )}
          <TextInput
            style={pageStyles.input}
            placeholder="Sensitive inputs are masked"
            value={this.state.formData.email}
            onChangeText={value => this.handleFormChange('email', value)}
            keyboardType="email-address"
          />
        </FTSessionReplayView.Privacy>

        <View style={pageStyles.hideWrapper}>
          {this.renderExampleLabel(
            'FTSessionReplayView.Hide',
            'This area is visible in the app and hidden in Session Replay.',
          )}
          <FTSessionReplayView.Hide
            nativeID="sessionReplay.hide"
            style={[pageStyles.exampleBox, pageStyles.hideBox]}>
            <Text style={pageStyles.bodyText}>
              Hidden in replay: payment token demo
            </Text>
            <Slider
              value={this.state.sliderValue}
              onValueChange={sliderValue => this.setState({sliderValue})}
              minimumValue={0}
              maximumValue={1}
              step={0.01}
              minimumTrackTintColor="#0f766e"
              maximumTrackTintColor="#cbd5e1"
            />
            <Text style={pageStyles.secondaryText}>
              Slider Value: {this.state.sliderValue.toFixed(2)}
            </Text>
          </FTSessionReplayView.Hide>
        </View>
      </View>
    );
  }

  renderPickerModal() {
    const {pickerVisible, selectedLanguage} = this.state;

    return (
      <Modal
        visible={pickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={this.hidePicker}>
        <View style={pageStyles.modalOverlay}>
          <View style={pageStyles.pickerContainer}>
            <Text style={pageStyles.pickerTitle}>Choose a Language</Text>
            <View style={pageStyles.pickerWrapper}>
              <Picker
                selectedValue={selectedLanguage}
                style={pageStyles.picker}
                onValueChange={this.handlePickerChange}
                mode="dropdown"
                itemStyle={pageStyles.pickerItem}>
                <Picker.Item label="English" value="en" />
                <Picker.Item label="Spanish" value="es" />
                <Picker.Item label="French" value="fr" />
                <Picker.Item label="German" value="de" />
                <Picker.Item label="Chinese" value="zh" />
                <Picker.Item label="Japanese" value="ja" />
              </Picker>
            </View>

            <View style={pageStyles.buttonGroup}>
              <TouchableOpacity
                style={[pageStyles.actionButton, pageStyles.cancelButton]}
                onPress={this.hidePicker}>
                <Text style={pageStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[pageStyles.actionButton, pageStyles.confirmButton]}
                onPress={this.hidePicker}>
                <Text style={pageStyles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  renderControls() {
    const {isLoading, selectedLanguage, formData} = this.state;

    return (
      <View style={pageStyles.section}>
        <Text style={pageStyles.sectionTitle}>Interaction Controls</Text>
        <View style={pageStyles.space} />
        <TouchableOpacity
          style={pageStyles.primaryButton}
          onPress={this.showPicker}>
          <Text style={pageStyles.primaryButtonText}>Select Language</Text>
        </TouchableOpacity>
        <Text style={pageStyles.selectedText}>
          Selected: {selectedLanguage.toUpperCase()}
        </Text>

        <View style={pageStyles.nativeButtonWrap}>
          <Button
            title="Native Button"
            onPress={() => {
              Alert.alert('Button pressed', 'Native Button was clicked');
              console.log('Button pressed');
            }}
            color="#0f766e"
          />
        </View>

        <TouchableOpacity
          style={pageStyles.outlineButton}
          onPress={() => {
            Alert.alert('TouchableOpacity', 'Custom button clicked');
            console.log('button click');
          }}>
          <Text style={pageStyles.outlineButtonText}>
            TouchableOpacity Button
          </Text>
        </TouchableOpacity>

        <TouchableHighlight
          style={pageStyles.submitButton}
          underlayColor="#166534"
          onPress={this.handleSubmit}
          disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={pageStyles.submitButtonText}>Submit Form</Text>
          )}
        </TouchableHighlight>

        <View style={pageStyles.form}>
          <TextInput
            style={pageStyles.input}
            placeholder="Username"
            value={formData.username}
            onChangeText={value => this.handleFormChange('username', value)}
          />
          <TextInput
            style={pageStyles.input}
            placeholder="Email"
            keyboardType="email-address"
            value={formData.email}
            onChangeText={value => this.handleFormChange('email', value)}
          />
          <TextInput
            style={pageStyles.input}
            placeholder="Password"
            secureTextEntry
            value={formData.password}
            onChangeText={value => this.handleFormChange('password', value)}
          />
        </View>
      </View>
    );
  }

  renderContentSamples() {
    return (
      <View style={pageStyles.section}>
        <Text style={pageStyles.sectionTitle}>Content Samples</Text>
        {this.state.items.map(item => (
          <View key={item.id} style={pageStyles.listItem}>
            <Text style={pageStyles.listItemTitle}>{item.name}</Text>
            <Text style={pageStyles.listItemDescription}>
              {item.description}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  render() {
    const {refreshing} = this.state;

    return (
      <SafeAreaView style={pageStyles.container}>
        <ScrollView
          style={pageStyles.scrollView}
          contentContainerStyle={pageStyles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={this.onRefresh}
            />
          }>
        
          {this.renderPrivacyExamples()}
          {this.renderControls()}
          {this.renderContentSamples()}
        </ScrollView>
        {this.renderPickerModal()}
      </SafeAreaView>
    );
  }
}

const pageStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7f8',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  hero: {
    marginBottom: 16,
  },
  pageTitle: {
    color: '#10201d',
    fontSize: 26,
    fontWeight: '700',
  },
  pageDescription: {
    color: '#4b5f5a',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  section: {
    backgroundColor: '#ffffff',
    borderColor: '#d9e2df',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    padding: 14,
  },
  sectionTitle: {
    color: '#10201d',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#5b6f6a',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 12,
  },
  exampleBox: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
  },
  maskAllBox: {
    backgroundColor: '#eef8f7',
    borderColor: '#6fb5ad',
  },
  showTouchBox: {
    backgroundColor: '#f1f7ed',
    borderColor: '#7fb36d',
  },
  maskNoneBox: {
    backgroundColor: '#f7f4ee',
    borderColor: '#b6a372',
  },
  privacyBox: {
    backgroundColor: '#f7f4fb',
    borderColor: '#a58ac8',
  },
  hideWrapper: {
    marginTop: 12,
  },
  hideBox: {
    backgroundColor: '#f8eeee',
    borderColor: '#c98585',
    marginTop: 8,
  },
  exampleHeader: {
    marginBottom: 10,
  },
  exampleTitle: {
    color: '#10201d',
    fontSize: 15,
    fontWeight: '700',
  },
  exampleDescription: {
    color: '#556864',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  bodyText: {
    color: '#20312e',
    fontSize: 15,
    lineHeight: 21,
  },
  secondaryText: {
    color: '#586b67',
    fontSize: 13,
    marginTop: 6,
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inlineImage: {
    borderRadius: 6,
    height: 150,
    marginTop: 10,
    width: '100%',
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5d2',
    borderRadius: 6,
    borderWidth: 1,
    color: '#10201d',
    height: 42,
    marginTop: 10,
    paddingHorizontal: 12,
  },
  selectedText: {
    color: '#0f766e',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  nativeButtonWrap: {
    marginTop: 14,
  },
  outlineButton: {
    alignItems: 'center',
    borderColor: '#0f766e',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  outlineButtonText: {
    color: '#0f766e',
    fontSize: 15,
    fontWeight: '700',
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#15803d',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 16,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  form: {
    marginTop: 10,
  },
  listItem: {
    borderColor: '#e1e7e5',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
    padding: 12,
  },
  listItemTitle: {
    color: '#10201d',
    fontSize: 15,
    fontWeight: '700',
  },
  listItemDescription: {
    color: '#60736f',
    fontSize: 14,
    marginTop: 4,
  },
  modalOverlay: {
    backgroundColor: 'rgba(16, 32, 29, 0.48)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    padding: 16,
  },
  pickerWrapper: {
    backgroundColor: '#ffffff',
    borderColor: '#d9e2df',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pickerTitle: {
    color: '#10201d',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  picker: {
    color: '#10201d',
    height: 150,
    width: '100%',
  },
  pickerItem: {
    backgroundColor: '#ffffff',
    color: '#10201d',
  },
  buttonGroup: {
    flexDirection: 'row',
    marginTop: 16,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: '#eef2f1',
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#0f766e',
    marginLeft: 8,
  },
  cancelText: {
    color: '#20312e',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  space: {
    marginTop: 8,
  }
});

export default SessionReplayScreen;
