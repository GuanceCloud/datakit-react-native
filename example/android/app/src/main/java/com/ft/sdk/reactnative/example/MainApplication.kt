package com.ft.sdk.reactnative.example

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactHost
import com.ft.sdk.FTRUMConfig
import com.ft.sdk.FTSDKConfig
import com.ft.sdk.FTSdk
import com.ft.sdk.reactnative.FTMobilePackage
import com.ft.sdk.reactnative.utils.ReactNativeUtils
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
        DefaultNewArchitectureEntryPoint.load()
//      // Hybrid development SDK initialization example
//      FTMobileConfig config = new FTMobileConfig("datakitUrl");
//      config.setEnableSDKDebugLog(true);
//      FTMobileAgent.startWithConfigOptions(config);
//
//      FTRumConfig rumConfig = new FTRumConfig("rumAppId");
//      rumConfig.setEnableTraceUserResource(true);
//      #if DEBUG
//        // Need to filter out React Native symbolication requests and Expo log requests that only occur in development environment
//        rumConfig.setResourceUrlHandler(url -> FTReactNativeUtils.filterBlackResource(url));
//      #endif
//      FTMobileAgent.sharedInstance().startRumWithConfigOptions(rumConfig);
    }
  }

  fun SDKInit(){
    val sdkConfig = FTSDKConfig.builder("datakitUrl")
    sdkConfig.isDebug = true
      FTSdk.install(sdkConfig)
    val rumConfig = FTRUMConfig().setRumAppId("rumAppId")
    rumConfig.isEnableTraceUserResource = true
    if (BuildConfig.DEBUG) {
      //Need to filter out symbolication requests and Expo log requests that only occur in the development environment.
      rumConfig.setResourceUrlHandler { url ->
        return@setResourceUrlHandler ReactNativeUtils.isReactNativeDevUrl(url)
      }
    }
    // ...
      FTSdk.initRUMWithConfig(rumConfig)
    // ...
  }

}
