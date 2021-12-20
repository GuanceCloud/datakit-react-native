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
    val globalContext = map["globalContext"] as ReadableMap?

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

    globalContext?.toHashMap()?.forEach {
      rumConfig.addGlobalContext(it.key, it.value.toString())
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
    promise.resolve(null)
  }

  @ReactMethod
  fun stopResource(key: String, promise: Promise) {
    FTRUMGlobalManager.get().stopResource(key)
    promise.resolve(null)
  }

  @ReactMethod
  fun addResource(
    key: String,
    url: String,
    httpMethod: String,
    context: ReadableMap,
    promise: Promise
  ) {
    val map = context.toHashMap()
    val responseHeader = map["responseHeader"] as ReadableMap?
    val requestHeader = map["requestHeader"] as ReadableMap?
    val method = map["resourceMethod"] as String?
    val resourceStatus = map["resourceStatus"] as Int?
    val responseBody = map["responseBody"] as String?
    val responseConnection = map["responseConnection"] as String?
    val responseContentType = map["responseContentType"] as String?
    val responseContentEncoding = map["responseContentEncoding"] as String?
    val fetchStartTime = map["fetchStartTime"] as Long?
    val tcpStartTime = map["tcpStartTime"] as Long?
    val tcpEndTime = map["tcpEndTime"] as Long?
    val dnsStartTime = map["dnsStartTime"] as Long?
    val dnsEndTime = map["dnsEndTime"] as Long?
    val responseStartTime = map["responseStartTime"] as Long?
    val responseEndTime = map["responseEndTime"] as Long?
    val sslStartTime = map["sslStartTime"] as Long?
    val sslEndTime = map["sslEndTime"] as Long?

    val params = ResourceParams()
    params.responseHeader = responseHeader.toString()
    params.resourceMethod = method
    params.requestHeader = requestHeader.toString()
    params.resourceStatus = resourceStatus ?: 0
    params.responseBody = responseBody ?: ""
    params.responseConnection = responseConnection ?: ""
    params.responseContentType = responseContentType ?: ""
    params.responseContentEncoding = responseContentEncoding ?: ""
    params.url = url ?: ""

    val netStatusBean = NetStatusBean()
    netStatusBean.fetchStartTime = fetchStartTime ?: -1
    netStatusBean.tcpStartTime = tcpStartTime ?: -1
    netStatusBean.tcpEndTime = tcpEndTime ?: -1
    netStatusBean.dnsStartTime = dnsStartTime ?: -1
    netStatusBean.dnsEndTime = dnsEndTime ?: -1
    netStatusBean.responseStartTime = responseStartTime ?: -1
    netStatusBean.responseEndTime = responseEndTime ?: -1
    netStatusBean.sslStartTime = sslStartTime ?: -1
    netStatusBean.sslEndTime = sslEndTime ?: -1
    FTRUMGlobalManager.get().addResource(key, params, netStatusBean)
    promise.resolve(null)

  }
}
