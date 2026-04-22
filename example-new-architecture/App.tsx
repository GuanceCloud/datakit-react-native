/**
 * FT SDK React Native New Architecture Example
 * Demonstrates Log, Trace, RUM and Session Replay Privacy Views
 */

import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  View,
  Alert,
  Image,
} from 'react-native';
import {
  FTLogConfig,
  FTLogStatus,
  FTMobileConfig,
  FTMobileReactNative,
  FTReactNativeLog,
  FTReactNativeRUM,
  FTReactNativeTrace,
  FTRUMConfig,
  FTRUMResource,
  FTTraceConfig,
  FTDBCacheDiscard,
  TraceType,
} from '@cloudcare/react-native-mobile';
import {
  FTReactNativeSessionReplay,
  FTSessionReplayView,
  TextAndInputPrivacyLevel,
} from '@cloudcare/react-native-session-replay';
import Config from 'react-native-config';

function App(): React.JSX.Element {
  const createRandomImage = () => {
    const timestamp = Date.now();
    const suffix = Math.random().toString(36).slice(2, 8);
    return {
      timestamp,
      uri: `https://picsum.photos/seed/${timestamp}-${suffix}/360/220`,
    };
  };

  const [switchValue, setSwitchValue] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [logCount, setLogCount] = useState(0);
  const [actionCount, setActionCount] = useState(0);
  const [sdkReady, setSdkReady] = useState(false);
  const [initMessage, setInitMessage] = useState('Initializing SDK...');
  const [randomImage, setRandomImage] = useState(createRandomImage);

  useEffect(() => {
    let mounted = true;

    const initializeSdk = async () => {
      const datawayUrl = Config.DATAWAY_URL;
      const clientToken = Config.CLIENT_TOKEN;
      const iOSAppId = Config.IOS_APP_ID;
      const androidAppId = Config.ANDROID_APP_ID;

      if (!datawayUrl || !clientToken) {
        if (mounted) {
          setInitMessage('SDK config missing DATAWAY_URL or CLIENT_TOKEN');
        }
        return;
      }

      try {
        await FTMobileReactNative.sdkConfig({
          datawayUrl,
          clientToken,
          debug: true,
          env: 'test',
          dbDiscardStrategy: FTDBCacheDiscard.discard,
        });

        await FTReactNativeLog.logConfig({
          enableCustomLog: true,
          sampleRate: 1,
        });

        await FTReactNativeTrace.setConfig({
          sampleRate: 1,
          traceType: TraceType.ddTrace,
          enableLinkRUMData: true,
        });

        if (iOSAppId || androidAppId) {
          await FTReactNativeRUM.setConfig({
            androidAppId,
            iOSAppId,
            sampleRate: 1,
            enableAutoTrackUserAction: true,
            enableAutoTrackError: true,
          });
          await FTReactNativeRUM.startView('App_FirstView');
        }

        await FTReactNativeSessionReplay.sessionReplayConfig({
          sampleRate: 1,
          textAndInputPrivacy: TextAndInputPrivacyLevel.MASK_SENSITIVE_INPUTS,
        });

        await FTReactNativeLog.logging('SDK initialized', FTLogStatus.info);

        if (mounted) {
          setSdkReady(true);
          setInitMessage('SDK initialized');
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'SDK initialization failed';
        if (mounted) {
          setInitMessage(message);
        }
      }
    };

    initializeSdk();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLog = async (status: FTLogStatus | string) => {
    if (!sdkReady) {
      Alert.alert('Logger Not Ready', initMessage);
      return;
    }
    await FTReactNativeLog.logging(`Test log ${logCount + 1}`, status);
    setLogCount(logCount + 1);
    Alert.alert('Log Sent', `Status: ${status}`);
  };

  const handleTrace = async () => {
    const url = 'https://httpbin.org/status/200';
    const traceHeader = await FTReactNativeTrace.getTraceHeaderFields(url);
    fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...traceHeader,
      },
    })
      .then(res => Alert.alert('Trace', `Status: ${res.status}`))
      .catch(err => Alert.alert('Trace Error', err.message));
  };

  const handleStartAction = async () => {
    await FTReactNativeRUM.startAction(`action_start`, 'custom');
  };

  const handleAddAction = async () => {
    await FTReactNativeRUM.addAction(
      `add_action_${actionCount + 1}`,
      'custom',
      {
        addAction_property: 'rn_demo',
      },
    );
    setActionCount(actionCount + 1);
    Alert.alert('Action Added', `Count: ${actionCount + 1}`);
  };

  const handleAddError = async () => {
    await FTReactNativeRUM.addError('Test error stack', 'Test error message');
    Alert.alert('Error Added', 'Error tracked successfully');
  };

  const handleStartView = async () => {
    await FTReactNativeRUM.startView('TestView');
    Alert.alert('View Started', 'View tracking started');
  };

  const handleStopView = async () => {
    await FTReactNativeRUM.stopView({stopView_property: 'rn_demo'});
    Alert.alert('View Stopped', 'View tracking stopped');
  };

  const trackResource = async (url: string) => {
    const key = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const fetchOptions = {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    };

    await FTReactNativeRUM.startResource(key, {
      startResource_property_demo: 'rn_demo',
    });

    let res: Response | undefined;

    try {
      res = await fetch(url, fetchOptions);
    } finally {
      const resource: FTRUMResource = {
        url,
        httpMethod: fetchOptions.method,
        requestHeader: fetchOptions.headers,
      };

      if (res) {
        const header: Record<string, string> = {};
        res.headers.forEach((value, name) => {
          header[name] = value;
        });
        resource.responseHeader = header;
        resource.resourceStatus = res.status;
        resource.responseBody = await res.text();
      }

      await FTReactNativeRUM.stopResource(key, {
        endResource_property_demo: 'rn_demo',
      });
      await FTReactNativeRUM.addResource(key, resource);
    }
  };

  const handleResourceNormal = async () => {
    await trackResource('https://httpbin.org/status/200');
    Alert.alert('Resource Normal', '200 resource tracked');
  };

  const handleResourceError = async () => {
    await trackResource('https://httpbin.org/status/404');
    Alert.alert('Resource Error', '404 resource tracked');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>FT SDK Demo</Text>
          <Text style={styles.subtitle}>New Architecture (Fabric)</Text>
        </View>

        {/* Log Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Log Test</Text>
          <Text style={styles.configText}>
            Logger: {sdkReady ? 'Ready' : initMessage}
          </Text>
          <View style={styles.logButtonRow}>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => handleLog(FTLogStatus.info)}>
              <Text style={styles.smallButtonText}>Info</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => handleLog(FTLogStatus.warning)}>
              <Text style={styles.smallButtonText}>Warning</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => handleLog(FTLogStatus.error)}>
              <Text style={styles.smallButtonText}>Error</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => handleLog(FTLogStatus.critical)}>
              <Text style={styles.smallButtonText}>Critical</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => handleLog(FTLogStatus.ok)}>
              <Text style={styles.smallButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.countText}>Logs sent: {logCount}</Text>
        </View>

        {/* Trace Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trace Test</Text>
          <TouchableOpacity style={styles.button} onPress={handleTrace}>
            <Text style={styles.buttonText}>Send HTTP Request with Trace</Text>
          </TouchableOpacity>
        </View>

        {/* RUM Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RUM Test</Text>
          <TouchableOpacity style={styles.button} onPress={handleStartAction}>
            <Text style={styles.buttonText}>Start Action </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleAddAction}>
            <Text style={styles.buttonText}>Add Action ({actionCount})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleAddError}>
            <Text style={styles.buttonText}>Add Error</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleStartView}>
            <Text style={styles.buttonText}>Start View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleStopView}>
            <Text style={styles.buttonText}>Stop View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={handleResourceNormal}>
            <Text style={styles.buttonText}>Resource Normal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={handleResourceError}>
            <Text style={styles.buttonText}>Resource Error</Text>
          </TouchableOpacity>
        </View>

        {/* Session Replay Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Replay Privacy</Text>
          <Text style={styles.description}>
            MaskAll: Content is masked in recording
          </Text>
          <FTSessionReplayView.MaskAll nativeID="maskAll-demo">
            <Text style={styles.demoText}>Masked text content</Text>
            <TextInput
              style={styles.input}
              placeholder="Masked input"
              value={inputValue}
              onChangeText={setInputValue}
            />
          </FTSessionReplayView.MaskAll>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MaskAll + ShowTouch</Text>
          <FTSessionReplayView.MaskAll showTouch nativeID="maskAll-touch">
            <View style={styles.row}>
              <Text style={styles.demoText}>Switch: </Text>
              <Switch
                value={switchValue}
                onValueChange={setSwitchValue}
                trackColor={{false: '#767577', true: '#81C784'}}
              />
            </View>
          </FTSessionReplayView.MaskAll>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MaskNone (Visible)</Text>
          <FTSessionReplayView.MaskNone nativeID="maskNone-demo">
            <Text style={styles.demoText}>This text is visible in replay</Text>
          </FTSessionReplayView.MaskNone>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hide (Not Recorded)</Text>
          <FTSessionReplayView.Hide nativeID="hide-demo">
            <View style={styles.hiddenBox}>
              <Text style={styles.hiddenText}>Not recorded at all</Text>
            </View>
          </FTSessionReplayView.Hide>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Replay Gallery</Text>
          <Text style={styles.description}>
            Random image from picsum.photos
          </Text>
          <FTSessionReplayView.MaskNone nativeID="gallery-visible">
            <View style={styles.galleryCard}>
              <Image
                source={{uri: randomImage.uri}}
                style={styles.galleryImage}
              />
            </View>
          </FTSessionReplayView.MaskNone>
        </View>

        {/* Config Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SDK Configuration</Text>
          <Text style={styles.configText}>
            Dataway: {Config.DATAWAY_URL ? 'Set' : 'Not set'}
          </Text>
          <Text style={styles.configText}>
            Token: {Config.CLIENT_TOKEN ? 'Set' : 'Not set'}
          </Text>
          <Text style={styles.configText}>
            RUM AppId:{' '}
            {Config.IOS_APP_ID || Config.ANDROID_APP_ID ? 'Set' : 'Not set'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginTop: 5,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 12,
    color: '#999',
    marginBottom: 10,
  },
  demoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  galleryCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fafafa',
  },
  galleryHeader: {
    minHeight: 46,
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  galleryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  galleryImage: {
    width: '100%',
    height: 220,
    backgroundColor: '#e5e7eb',
  },
  logButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 10,
    marginHorizontal: -4,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  smallButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginHorizontal: 4,
    marginVertical: 4,
    minWidth: 64,
    alignItems: 'center',
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  countText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  hiddenBox: {
    backgroundColor: '#ff9800',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  hiddenText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  configText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
});

export default App;
