package com.cloudcare.ft.mobile.sdk.tracker.reactnative.example

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.FTMobilePackage
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.utils.ReactNativeUtils
import com.ft.sdk.FTRUMConfig
import com.ft.sdk.FTSDKConfig
import com.ft.sdk.FTSdk

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
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
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
//    SoLoader.init(this, false)
    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
      // If you opted-in for the New Architecture, we load the native entry point for this app.
      load()
//      // 混合开发 SDK 初始化示例
//      guanceSDKInit();
    }
  }

  fun guanceSDKInit(){
    val sdkConfig = FTSDKConfig.builder("datakitUrl")
    sdkConfig.isDebug = true
    FTSdk.install(sdkConfig)
    val rumConfig = FTRUMConfig().setRumAppId("rumAppId")
    rumConfig.isEnableTraceUserResource = true
    if (BuildConfig.DEBUG) {
      // 需要过滤掉仅在开发环境中发生的 React Native 符号化调用请求和 Expo日志调用请求
      rumConfig.setResourceUrlHandler { url ->
        return@setResourceUrlHandler ReactNativeUtils.isReactNativeDevUrl(url)
      }
    }
    // ...
    FTSdk.initRUMWithConfig(rumConfig)
    // ...
  }

}
