package com.ft.sdk.reactnative.example

import com.ft.sdk.reactnative.FTMobilePackage
import com.ft.sdk.reactnative.utils.ReactNativeUtils
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost
import com.ft.sdk.FTLoggerConfig
import com.ft.sdk.FTRUMConfig
import com.ft.sdk.FTSDKConfig
import com.ft.sdk.FTSdk
import com.ft.sdk.SessionReplayManager
import com.ft.sdk.reactnative.sessionreplay.ReactNativeSessionReplayExtensionSupport
import com.ft.sdk.reactnative.sessionreplay.utils.text.TextViewUtils
import com.ft.sdk.sessionreplay.FTSessionReplayConfig
import com.ft.sdk.sessionreplay.SessionReplayPrivacy
import com.ft.sdk.sessionreplay.material.MaterialExtensionSupport
import com.reactnativenavigation.NavigationApplication
import com.reactnativenavigation.react.NavigationReactNativeHost


class MainApplication : NavigationApplication(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
    object : NavigationReactNativeHost(this) {
      override fun getPackages(): List<ReactPackage> =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          add(FTMobilePackage())
        }

      override fun getJSMainModuleName(): String = "index"

      override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG
      override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
      override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
    }

  override val reactHost: ReactHost
    get() = DefaultReactHost.getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
//    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
    }
    //guanceSDKInit()
  }

  fun SDKInit(){
    val sdkConfig = FTSDKConfig.builder("datakitUrl")
    sdkConfig.isDebug = true
    FTSdk.install(sdkConfig)
    // rum
    val rumConfig = FTRUMConfig().setRumAppId(BuildConfig.ANDROID_APP_ID)
    rumConfig.isEnableTrackAppANR = true
    rumConfig.isEnableTrackAppCrash = true
    rumConfig.isEnableTraceUserAction = true
    rumConfig.isEnableTraceUserResource = true
    if (BuildConfig.DEBUG) {
      //Need to filter out symbolication requests and Expo log requests that only occur
      // in the development environment.
      rumConfig.setResourceUrlHandler { url ->
        return@setResourceUrlHandler ReactNativeUtils.isReactNativeDevUrl(url)
      }
    }
    FTSdk.initRUMWithConfig(rumConfig)

    //log
    val logConfig = FTLoggerConfig().setEnableLinkRumData(true)
    FTSdk.initLogWithConfig(logConfig)

    //session replay
    val sessionReplayConfig = FTSessionReplayConfig()
    sessionReplayConfig
      .setPrivacy(SessionReplayPrivacy.MASK_USER_INPUT)
      .addExtensionSupport(MaterialExtensionSupport())//material
    FTSdk.initSessionReplayConfig(sessionReplayConfig)

  }

  /**
   *  ensure react native part loaded then call this
   */
  private fun reactNativeSessionReplayConfigInit() {
    val sessionReplayConfig = FTSessionReplayConfig()
    val reactContext = reactNativeHost.reactInstanceManager.currentReactContext
    reactContext.let {
      val textViewUtils = TextViewUtils.create(
        it,
        SessionReplayManager.get().internalLogger
      )
      sessionReplayConfig.addExtensionSupport(
        ReactNativeSessionReplayExtensionSupport(
          textViewUtils
        )
      )
      sessionReplayConfig
        .setPrivacy(SessionReplayPrivacy.MASK_USER_INPUT)
        .addExtensionSupport(MaterialExtensionSupport())//material
        .addExtensionSupport(ReactNativeSessionReplayExtensionSupport(textViewUtils))//react native part
      FTSdk.initSessionReplayConfig(sessionReplayConfig)
    }
  }

}
