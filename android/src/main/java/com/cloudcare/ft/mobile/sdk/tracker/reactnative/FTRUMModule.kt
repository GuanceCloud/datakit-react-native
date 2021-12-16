package com.cloudcare.ft.mobile.sdk.tracker.reactnative

import com.facebook.react.bridge.*
import com.ft.sdk.FTRUMConfig
import com.ft.sdk.FTRUMGlobalManager
import com.ft.sdk.FTSdk
import com.ft.sdk.garble.bean.AppState
import com.ft.sdk.garble.bean.ErrorType
import com.ft.sdk.garble.bean.NetStatusBean
import com.ft.sdk.garble.bean.ResourceParams

class FTRUMModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String {
    return "FTReactNativeRUM"
  }

  @ReactMethod
  fun setConfig(
    rumAppId: String, context: ReadableMap, promise: Promise
  ) {
    val map = context.toHashMap()
    val sampleRate = map["sampleRate"] as Float?
    val enableNativeUserAction = map["enableNativeUserAction"] as Boolean?
    val enableNativeUserView = map["enableNativeUserView"] as Boolean?
    val enableNativeUserResource = map["enableNativeUserResource"] as Boolean?
    val monitorType = map["extraMonitorTypeWithError"] as Int?
    val globalContext = map["globalContext"] as Map<String, String>?

    val rumConfig = FTRUMConfig().setRumAppId(rumAppId)
    if (sampleRate != null) {
      rumConfig.samplingRate = sampleRate
    }

    if (enableNativeUserAction != null) {
      rumConfig.isEnableTraceUserAction = enableNativeUserAction
    }

    if (enableNativeUserView != null) {
      rumConfig.isEnableTraceUserView = enableNativeUserView
    }

    if (enableNativeUserResource != null) {
      rumConfig.isEnableTraceUserResource = enableNativeUserResource
    }

    if (monitorType != null) {
      rumConfig.extraMonitorTypeWithError = monitorType
    }

    globalContext?.forEach {
      rumConfig.addGlobalContext(it.key, it.value)
    }

    FTSdk.initRUMWithConfig(rumConfig)
    promise.resolve(null)
  }

  @ReactMethod
  fun startAction(actionName: String, actionType: String, promise: Promise) {
    FTRUMGlobalManager.get().startAction(actionName, actionType)
    promise.resolve(null)

  }

  @ReactMethod
  fun statView(viewName: String, viewReferer: String, promise: Promise) {
    FTRUMGlobalManager.get().startView(viewName, viewReferer)
    promise.resolve(null)
  }

  @ReactMethod
  fun stopView(promise: Promise) {
    FTRUMGlobalManager.get().stopView()
    promise.resolve(null)
  }

  @ReactMethod
  fun addError(stack: String, message: String, promise: Promise) {
    FTRUMGlobalManager.get().addError(stack, message, ErrorType.JAVA, AppState.RUN)
    promise.resolve(null)
  }

  @ReactMethod
  fun startResource(key: String, promise: Promise) {
    FTRUMGlobalManager.get().startResource(key)
  }

  @ReactMethod
  fun stopResource(key: String, promise: Promise) {
    FTRUMGlobalManager.get().stopResource(key)
  }

  @ReactMethod
  fun addResource(
    key: String,
    url: String,
    httpMethod: String,
    context: ReadableMap,
    promise: Promise
  ) {
    val params = ResourceParams()
    val netStatusBean = NetStatusBean()
    FTRUMGlobalManager.get().addResource(key, params, netStatusBean)

  }
}
