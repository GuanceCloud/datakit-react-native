/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import type {PropsWithChildren} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {
  DetectFrequency,
  DeviceMetricsMonitorType,
  EnvType,
  ErrorMonitorType,
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
  FTRumActionTracking,
  SessionReplayPrivacy,
  FTReactNativeSessionReplay,
  FTSessionReplayConfig,
  FTRumErrorTracking
} from '@cloudcare/react-native-mobile';
import Config from 'react-native-config';
import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';

type SectionProps = PropsWithChildren<{
  title: string;
}>;
console.warn({FTMobileReactNative});

// SDK initialization
(async () => {
  console.warn("SDK initialization start");
   //Basic configuration
  let config: FTMobileConfig = {
    datawayUrl:Config.DATAWAY_URL,
    clientToken:Config.CLIENT_TOKEN,
    debug: true,
    env:'test',
    enableLimitWithDbSize:true,
    dbCacheLimit:50*1024*1024,
    dbDiscardStrategy:FTDBCacheDiscard.discard,
    // envType:EnvType.prod,
    globalContext: { 'sdk_example': 'example1' },
  };
  await FTMobileReactNative.sdkConfig(config);
 console.warn("SDK initialization 1 end");
  // log settings
  let logConfig: FTLogConfig = {
    enableCustomLog: true,
    enableLinkRumData: true,
    logCacheLimitCount: 2000,
    sampleRate:1,
    globalContext: { 'log_example': 'example2' },
  };
  await FTReactNativeLog.logConfig(logConfig);
 console.warn("SDK initialization 2 end");
  // trace settings
  let traceConfig: FTTraceConfig = {
    enableLinkRUMData: true,
    enableNativeAutoTrace: true,
    sampleRate:1.0,
    traceType: TraceType.ddTrace,
  };
  await FTReactNativeTrace.setConfig(traceConfig);
  console.warn("SDK initialization 3 end");

  // rum settings
  let rumConfig: FTRUMConfig = {
    androidAppId: Config.ANDROID_APP_ID,
    iOSAppId:Config.IOS_APP_ID,
    enableAutoTrackUserAction: true,
    enableAutoTrackError: true,
    enableNativeUserAction: true,
    enableNativeUserView: false,
    sampleRate:1,
    enableNativeUserResource: true,
    enableResourceHostIP:true,
    enableTrackNativeAppANR:true,
    enableTrackNativeCrash:true,
    enableTrackNativeFreeze:true,
    errorMonitorType:ErrorMonitorType.cpu | ErrorMonitorType.memory,
    deviceMonitorType:DeviceMetricsMonitorType.all,
    detectFrequency:DetectFrequency.rare,
    rumCacheLimitCount:1000,
    rumDiscardStrategy:FTRUMCacheDiscard.discardOldest,
  };
  // Static globalContext setting
  //Set in environment files like .env.debug, .env.release, etc.
  rumConfig.globalContext = { 'track_id': Config.TRACK_ID };
  await FTReactNativeRUM.setConfig(rumConfig);
  console.warn("SDK initialization 4 end");
  /** Dynamic globalContext setting
   new Promise(function(resolve) {
       AsyncStorage.getItem("track_id",(error,result)=>{
        if (result === null){
          console.log('Get failed: ' + error);
        }else {
          console.log('Get successful: ' + result);
          if( result != undefined){
            rumConfig.globalContext = {"track_id":result};
          }
        }
        resolve(FTReactNativeRUM.setConfig(rumConfig));
      })
     })
   */
  let sessionReplayConfig:FTSessionReplayConfig = {
    sampleRate:1,
    privacy:SessionReplayPrivacy.ALLOW
  }
  await FTReactNativeSessionReplay.sessionReplayConfig(sessionReplayConfig);
    console.warn("SDK initialization 5 end");

  setTimeout(async () => {
    await  FTReactNativeRUM.startView("Home");
  }, 1000);
  FTReactNativeLog.logging('config complete', FTLogStatus.info);
  setTimeout(async () => {
    await  FTReactNativeRUM.startView("Home2");
  }, 2000);
   

})();

function Section({children, title}: SectionProps): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  return (
    <View style={styles.sectionContainer}>
      <Text
        style={[
          styles.sectionTitle,
          {
            color: isDarkMode ? Colors.white : Colors.black,
          },
        ]}>
        {title}
      </Text>
      <Text
        style={[
          styles.sectionDescription,
          {
            color: isDarkMode ? Colors.light : Colors.dark,
          },
        ]}>
        {children}
      </Text>
    </View>
  );
}

function App(): React.JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <Header />
        <View
          style={{
            backgroundColor: isDarkMode ? Colors.black : Colors.white,
          }}>
          <Section title="Step One">
            Edit <Text style={styles.highlight}>App.tsx</Text> to change this
            screen and then come back to see your edits.
          </Section>
          <Section title="See Your Changes">
            <ReloadInstructions />
          </Section>
          <Section title="Debug">
            <DebugInstructions />
          </Section>
          <Section title="Learn More">
            Read the docs to discover what to do next:
          </Section>
          <LearnMoreLinks />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
});

export default App;
