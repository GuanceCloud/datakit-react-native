/**
 * Simple React Native App for FT SDK Testing
 */

import React, {useState} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
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
  FTTraceConfig,
  TraceType,
  FTDBCacheDiscard,
  FTRUMCacheDiscard,
  DetectFrequency,
  DeviceMetricsMonitorType,
  ErrorMonitorType,
  SessionReplayPrivacy,
  FTReactNativeSessionReplay,
  FTSessionReplayConfig,
} from '@cloudcare/react-native-mobile';
import Config from 'react-native-config';

// SDK initialization
(async () => {
  console.warn("SDK initialization start");
  
  // Basic configuration
  let config: FTMobileConfig = {
    datawayUrl: Config.DATAWAY_URL || '',
    clientToken: Config.CLIENT_TOKEN || '',
    debug: true,
    env: 'test',
    enableLimitWithDbSize: true,
    dbCacheLimit: 50 * 1024 * 1024,
    dbDiscardStrategy: FTDBCacheDiscard.discard,
    globalContext: { 'sdk_example': 'example1' },
  };
  await FTMobileReactNative.sdkConfig(config);
  console.warn("SDK initialization 1 end");
  
  // Log settings
  let logConfig: FTLogConfig = {
    enableCustomLog: true,
    enableLinkRumData: true,
    logCacheLimitCount: 2000,
    sampleRate: 1,
    globalContext: { 'log_example': 'example2' },
  };
  await FTReactNativeLog.logConfig(logConfig);
  console.warn("SDK initialization 2 end");
  
  // Trace settings
  let traceConfig: FTTraceConfig = {
    enableLinkRUMData: true,
    enableNativeAutoTrace: true,
    sampleRate: 1.0,
    traceType: TraceType.ddTrace,
  };
  await FTReactNativeTrace.setConfig(traceConfig);
  console.warn("SDK initialization 3 end");

  // RUM settings
  let rumConfig: FTRUMConfig = {
    androidAppId: Config.ANDROID_APP_ID || '',
    iOSAppId: Config.IOS_APP_ID || '',
    enableAutoTrackUserAction: true,
    enableAutoTrackError: true,
    enableNativeUserAction: true,
    enableNativeUserView: false,
    sampleRate: 1,
    enableNativeUserResource: true,
    enableResourceHostIP: true,
    enableTrackNativeAppANR: true,
    enableTrackNativeCrash: true,
    enableTrackNativeFreeze: true,
    errorMonitorType: ErrorMonitorType.cpu | ErrorMonitorType.memory,
    deviceMonitorType: DeviceMetricsMonitorType.all,
    detectFrequency: DetectFrequency.rare,
    rumCacheLimitCount: 1000,
    rumDiscardStrategy: FTRUMCacheDiscard.discardOldest,
  };
  rumConfig.globalContext = { 'track_id': Config.TRACK_ID || '' };
  await FTReactNativeRUM.setConfig(rumConfig);
  console.warn("SDK initialization 4 end");
  
  // Session Replay settings
  let sessionReplayConfig: FTSessionReplayConfig = {
    sampleRate: 1,
    privacy: SessionReplayPrivacy.ALLOW
  };
  await FTReactNativeSessionReplay.sessionReplayConfig(sessionReplayConfig);
  console.warn("SDK initialization 5 end");

  // Start view tracking
  setTimeout(async () => {
    await FTReactNativeRUM.startView("Home");
  }, 1000);
  
  FTReactNativeLog.logging('config complete', FTLogStatus.info);
  
})();

function App(): React.JSX.Element {
  const [logCount, setLogCount] = useState(0);
  const [actionCount, setActionCount] = useState(0);

  const handleLogTest = async () => {
    try {
      await FTReactNativeLog.logging(`Test log message ${logCount + 1}`, FTLogStatus.info);
      setLogCount(logCount + 1);
      Alert.alert('Success', 'Log sent successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send log');
    }
  };

  const handleActionTest = async () => {
    try {
      await FTReactNativeRUM.addAction(`test_action_${actionCount + 1}`, 'custom');
      setActionCount(actionCount + 1);
      Alert.alert('Success', 'Action tracked successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to track action');
    }
  };

  const handleErrorTest = async () => {
    try {
      await FTReactNativeRUM.addError('Test Error', 'Test error stack trace');
      Alert.alert('Success', 'Error tracked successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to track error');
    }
  };

  const handleViewTest = async () => {
    try {
      await FTReactNativeRUM.startView('TestView');
      setTimeout(async () => {
        await FTReactNativeRUM.stopView();
      }, 2000);
      Alert.alert('Success', 'View tracking started!');
    } catch (error) {
      Alert.alert('Error', 'Failed to track view');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>FT SDK Test App</Text>
          <Text style={styles.subtitle}>React Native New Architecture</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SDK Status</Text>
            <Text style={styles.statusText}>✅ SDK Initialized</Text>
            <Text style={styles.statusText}>✅ RUM Tracking Enabled</Text>
            <Text style={styles.statusText}>✅ Log Collection Enabled</Text>
            <Text style={styles.statusText}>✅ Session Replay Enabled</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Functions</Text>
            
            <TouchableOpacity style={styles.button} onPress={handleLogTest}>
              <Text style={styles.buttonText}>Send Test Log ({logCount})</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={handleActionTest}>
              <Text style={styles.buttonText}>Track Custom Action ({actionCount})</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={handleErrorTest}>
              <Text style={styles.buttonText}>Track Test Error</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={handleViewTest}>
              <Text style={styles.buttonText}>Track Test View</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configuration</Text>
            <Text style={styles.configText}>Environment: {Config.ENV || 'test'}</Text>
            <Text style={styles.configText}>Dataway URL: {Config.DATAWAY_URL || 'Not set'}</Text>
            <Text style={styles.configText}>Client Token: {Config.CLIENT_TOKEN ? 'Set' : 'Not set'}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 5,
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 15,
  },
  statusText: {
    fontSize: 14,
    color: '#28a745',
    marginBottom: 5,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  configText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 5,
  },
});

export default App;
