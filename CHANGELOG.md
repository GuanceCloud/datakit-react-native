> Related SDK update content
> * [Android](https://github.com/GuanceCloud/datakit-android/blob/dev/ft-sdk/CHANGELOG.md)
> * [iOS ](https://github.com/GuanceCloud/datakit-ios/blob/develop/CHANGELOG.md)

# 0.4.0-alpha.4
* iOS Fix crash issue caused by nil string in Session Replay
* Compatible with iOS SDK 1.6.2-alpha.3

---
# 0.4.0-alpha.3
* Android Fix import missing issues in rn76

---
# 0.4.0-alpha.2
* Android compatible with multiple versions of React Native rn75 rn76 rn79 rn80
* Compatible with Android ft-sdk 1.7.0-alpha20, ft-session-replay 0.1.2-alpha02, iOS 1.6.2-alpha.1
* merge the version 0.3.14

---
# 0.4.0-alpha.1
* Add Session Replay Features
* Compatible with Android ft-sdk:1.7.0-alpha05 ft-session-replay:0.1.0-alpha05
* Base on 0.3.3
---
# 0.3.15
* Compatible with Android ft-sdk 1.6.13, ft-native 1.1.2 
* Compatible with iOS SDK 1.5.18
---
# 0.3.14
* Support setting error sampling through `FTRUMConfig.sessionErrorSampleRate`. When not sampled by sampleRate, RUM data from 1 minute before the error occurs can be sampled when an error occurs
* Add `FTMobileConfig.lineDataModifier`, `FTMobileConfig.dataModifier` to support data write replacement and data desensitization
* Compatible with Android ft-sdk 1.6.11, iOS 1.5.16

---
# 0.3.13
* Android Java 8 compatibility adjustments, remove kotlin library dependency

---
# 0.3.12
* Add new RUM `Resource` data fields `resource_first_byte_time`, `resource_dns_time`, `resource_download_time`, `resource_connect_time`, `resource_ssl_time`, `resource_redirect_time`, support enhanced Resource time display on Guance Cloud and align timeline with "Application Performance Monitoring" flame graph
* `FTMobileConfig.enableDataIntegerCompatible` enabled by default
* Compatible with Android ft-sdk 1.6.9, iOS 1.5.12, 1.5.13, 1.5.14

---
# 0.3.12-alpha.1
* Android compatible with 1.6.9-beta02 version

---
# 0.3.11
* Native and React Native hybrid development SDK configuration optimization
  * Support automatic collection of React Native control click events through `FTRumActionTracking.startTracking()` method, and automatic collection of React Native error logs through `FTRumErrorTracking.startTracking()` method
  * When enabling RUM Resource auto collection, add new methods iOS `FTReactNativeUtils.filterBlackResource(url)`, Android `ReactNativeUtils.isReactNativeDevUrl(url)` to filter React Native symbolication requests and Expo log requests in development environment, reducing redundant data
* Compatible with iOS SDK 1.5.11
---
# 0.3.10
* Modify iOS bridge code to reference native SDK header files
* Add RUM entry count limit functionality, support limiting SDK maximum cache entry data through `FTRUMConfig.rumCacheLimitCount`,
  support specifying whether to discard new data or old data through `FTRUMConfig.rumDiscardStrategy` setting
* Add support for limiting total cache size through `FTMobileConfig.enableLimitWithDbSize`. After enabling,
   `FTLoggerConfig.logCacheLimitCount` and `FTRUMConfig.rumCacheLimitCount` will be invalid,
   support setting db discard strategy through `FTMobileConfig.dbDiscardStrategy`, support setting db cache limit size through `FTMobileConfig.dbCacheLimit`
* Compatible with iOS SDK 1.5.10, Android SDK ft-sdk 1.6.8
---
# 0.3.10-alpha.1
* Modify iOS bridge code to reference native SDK header files
* Add RUM entry count limit functionality, support limiting SDK maximum cache entry data through `FTRUMConfig.rumCacheLimitCount`,
  support specifying whether to discard new data or old data through `FTRUMConfig.rumDiscardStrategy` setting
* Add support for limiting total cache size through `FTMobileConfig.enableLimitWithDbSize`. After enabling,
   `FTLoggerConfig.logCacheLimitCount` and `FTRUMConfig.rumCacheLimitCount` will be invalid,
   support setting db discard strategy through `FTMobileConfig.dbDiscardStrategy`, support setting db cache limit size through `FTMobileConfig.dbCacheLimit`
* Compatible with iOS SDK 1.5.9, Android SDK ft-sdk 1.6.7
---
# 0.3.9
* To improve React Android compatibility, change Android React Native Bridge part from Kotlin to Java
* Compatible with Android SDK ft-sdk 1.6.5
  * Weaken Webview null parameter prompts during AOP process
  * Optimize long Session update mechanism when app is in background
---
# 0.3.8-beta.1
* Same as 0.3.8-alpha.2

---
# 0.3.8-alpha.2
* To improve React Android compatibility, change Android React Native Bridge part from Kotlin to Java

---
# 0.3.8-alpha.1
* Android React Native AGP high version hybrid project compatibility adaptation

---
# 0.3.7
* Fix Android RN error data type annotation error issue
* Support setting freeze detection threshold through `FTRUMConfig.nativeFreezeDurationMs`
* Support using `FTMobileConfig.compressIntakeRequests` to configure `deflate` compression for synchronized data
* Compatible with iOS SDK 1.5.6
  * Support using `FTMobileConfig.compressIntakeRequests` to configure `deflate` compression for synchronized data
  * RUM add `addAction:actionType:property` and `startAction:actionType:property:` methods, optimize RUM Action collection logic
  * Fix crash issue caused by using deprecated `NSFileHandle` api
* Compatible with iOS SDK 1.5.7
  * Support setting freeze detection threshold through `FTRUMConfig.freezeDurationMs`
  * Optimize SDK's `shutDown` method to avoid stuttering or WatchDog crash caused by main thread synchronous waiting
* Compatible with Android SDK ft-sdk 1.6.2
  * RUM add `addAction` method, support property extension attributes and frequent continuous data reporting
* Compatible with Android SDK ft-sdk 1.6.3
  * Optimize custom `addAction` performance during high-frequency calls
  * Support using `FTSDKConfig.setCompressIntakeRequests` to configure `deflate` compression for synchronized data
* Compatible with Android SDK ft-sdk 1.6.4
  * Optimize App startup time statistics on API 24 and above
  * Support setting detection time range through `FTRUMConfig.setEnableTrackAppUIBlock(true, blockDurationMs)`
----
# 0.3.6
* Compatible with iOS SDK 1.5.5
  * Fix crash issue caused by array out of bounds in `FTResourceMetricsModel`
----
# 0.3.5
* Support collecting Native Error, ANR, Freeze
* Modify react-native auto collection error default error type
* For components with `onPress` property, add support for defining whether to collect click events of this component through custom property `ft-enable-track` after enabling `enableAutoTrackUserAction`, and add Action extra properties through `ft-extra-property`
----
# 0.3.4
* addError add custom error type
* Support globally dynamic addition of globalContext properties
* Support shutting down SDK through FTMobileReactNative.shutDown()
* Support clearing SDK data through FTMobileReactNative.clearAllData()
* Fix issue where `stack` and `message` parameters are assigned in reverse when auto collecting react-native Error
* Compatible with Android SDK ft-sdk 1.6.1
  * Fix issue where FTMetricsMTR thread is not recycled when RUM custom startView is called separately
	* Support adding dynamic properties through FTSdk.appendGlobalContext(globalContext), FTSdk.appendRUMGlobalContext(globalContext),
   		 FTSdk.appendLogGlobalContext(globalContext)
	*	Support clearing unreported cache data through FTSdk.clearAllData()
* Compatible with iOS SDK 1.5.4
  * Add global, log, RUM globalContext property dynamic setting methods
  * Add data clearing method, support deleting all data not yet uploaded to server
  * Adjust maximum time interval supported by sync interval to 5000 milliseconds
----
# 0.3.4-alpha.3
* Support shutting down SDK through FTMobileReactNative.shutDown()
* Support clearing SDK data through FTMobileReactNative.clearAllData()

----
# 0.3.4-alpha.2
* addError add custom error type
* Support globally dynamic addition of globalContext properties
* Compatible with Android SDK ft-sdk 1.6.1-alpha04
  * Fix issue where FTMetricsMTR thread is not recycled when RUM custom startView is called separately
  * Add global, log, RUM globalContext property dynamic setting methods
* Compatible with iOS SDK 1.5.4.alpha.2
  * Add global, log, RUM globalContext property dynamic setting methods

----
# 0.3.3
* Compatible with iOS SDK 1.5.3
----
# 0.3.2-hotfix.1
* Compatible with iOS SDK 1.5.2-hotfix.1
  * Fix crash issue caused by array out of bounds in `FTResourceMetricsModel`
----
# 0.3.2
* Fix Android configuration `FTMobileConfig.env` invalid issue
----
# 0.3.1
* Compatible with iOS SDK 1.5.2
* Compatibility fix for error when using `react/jsx-runtime` with React version below 16.14.0
* Android compatible with react native 0.63 low version
* Modify regex for filtering URLs pointing to localhost, increase matching range
----
# 0.3.1-alpha.4
* Fix issue where `replace-react-require.js` file not found
-----
# 0.3.1-alpha.3
* Compatibility fix for error when using `react/jsx-runtime` with React version below 16.14.0
-----
# 0.3.1-alpha.2
* Android compatible with react native 0.63 low version

-----
# 0.3.0
* Add support for data sync parameter configuration, request entry data, sync interval time, and log cache entry count
* RUM resource network request add remote ip address resolution functionality
* Add line protocol Integer data compatibility mode to handle web data type conflicts
* Log add custom status method
* React-native action collection method modification, adapt to React 17 issue where click events cannot be intercepted from React.createElement
* In Debug scenarios, RUM Resource collection filters out hot update connections pointing to localhost
* Fix Android underlying Double adaptation issue
-----
# 0.3.0-alpha.2
* Android compatible with react native 0.63 low version

-----
# 0.3.0-beta.2
* In Debug scenarios, RUM Resource collection filters out hot update connections pointing to localhost
* Fix Android underlying Double adaptation issue
-----
# 0.3.0-beta.1
* Same as 0.3.0-alpha.1
-----
# 0.3.0-alpha.1
* Add support for data sync parameter configuration, request entry data, sync interval time, and log cache entry count
* RUM resource network request add remote ip address resolution functionality
* Add line protocol Integer data compatibility mode to handle web data type conflicts
* Log add custom status method
* React-native action collection method modification, adapt to React 17 issue where click events cannot be intercepted from React.createElement

-----
# 0.2.9-beta.2
* Adjust peerDependencies restrictions

-----
# 0.2.9-beta.1
* Compatible with iOS SDK 1.5.1
* Compatible with Android ft-sdk 1.5.2, ft-native 1.1.1, ft-plugin-legacy 1.1.7

-----
# 0.2.8
* Compatible with iOS SDK 1.4.9-beta.4
* Compatible with Android 1.4.1-beta01
* Add dataway upload method
-----
# 0.2.7
* Compatible with iOS SDK 1.4.7-beta.1
* Compatible with Android 1.3.16-beta02
* Add env character custom mode
-----
# 0.2.6
* Compatible with iOS SDK 1.4.3-beta.1
* Compatible with android agent 1.3.12-beta01
* Add SDK version field sdk_package_reactnative

-----
# 0.2.5
* Compatible with iOS SDK 1.4.1-alpha.3
* Compatible with android ft-plugin-legacy 1.1.4-beta02
* Compatible with android agent 1.3.11-beta02
* Compatible with android native 1.0.0-beta01

-----
# 0.2.4
* Fix device metrics monitoring parameter error

-----
# 0.2.3
* Compatible with iOS SDK 1.3.10-beta.1
* Compatible with Android 1.3.9-beta02

-----
# 0.2.2
* Android Native SDK adjustments

-----
# 0.2.1
* Demo modifications
* Native SDK adjustments

-----
# 0.2.0
* startView parameter optimization
* Add onCreateView method

-----
# 0.1.1
* Android method call corrections
* Compatibility adaptations
