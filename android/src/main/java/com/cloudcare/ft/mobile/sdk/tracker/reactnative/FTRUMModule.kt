package com.cloudcare.ft.mobile.sdk.tracker.reactnative

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.utils.ReactNativeUtils
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
  fun setConfig(context: ReadableMap, promise: Promise) {
    val map = context.toHashMap()
    val rumAppId = map["rumAppId"] as String
    val sampleRate = map["sampleRate"] as Float?
    val enableNativeUserAction = map["enableNativeUserAction"] as Boolean?
    val enableNativeUserView = map["enableNativeUserView"] as Boolean?
    val enableNativeUserResource = map["enableNativeUserResource"] as Boolean?
    val monitorType = ReactNativeUtils.convertToNativeInt(map["extraMonitorTypeWithError"])
    val globalContext = map["globalContext"] as HashMap<String, Any>?

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
  fun onCreateView(viewName:String,duration:Double, promise: Promise){
      FTRUMGlobalManager.get().onCreateView(viewName,duration.toLong())
      promise.resolve(null)
  }

  @ReactMethod
  fun startView(viewName: String, promise: Promise) {
    FTRUMGlobalManager.get().startView(viewName)
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
  fun addResource(key: String, resourceContext: ReadableMap, metricsContext: ReadableMap, promise: Promise) {
    val resourceMap = resourceContext.toHashMap()
    val url = resourceMap["url"] as String?
    val responseHeader = resourceMap["responseHeader"] as HashMap<String, String>?
    val requestHeader = resourceMap["requestHeader"] as HashMap<String, String>?
    val method = resourceMap["resourceMethod"] as String?
    val resourceStatus = ReactNativeUtils.convertToNativeInt(resourceMap["resourceStatus"])
    val responseBody = resourceMap["responseBody"] as String?
    val responseConnection = resourceMap["responseConnection"] as String?
    val responseContentType = resourceMap["responseContentType"] as String?
    val responseContentEncoding = resourceMap["responseContentEncoding"] as String?

    val metricsMap = metricsContext.toHashMap()
    val fetchStartTime = ReactNativeUtils.convertToNativeLong(metricsMap["fetchStartTime"])
    val tcpStartTime = ReactNativeUtils.convertToNativeLong(metricsMap["tcpStartTime"])
    val tcpEndTime = ReactNativeUtils.convertToNativeLong(metricsMap["tcpEndTime"])
    val dnsStartTime = ReactNativeUtils.convertToNativeLong(metricsMap["dnsStartTime"])
    val dnsEndTime = ReactNativeUtils.convertToNativeLong(metricsMap["dnsEndTime"])
    val responseStartTime = ReactNativeUtils.convertToNativeLong(metricsMap["responseStartTime"])
    val responseEndTime = ReactNativeUtils.convertToNativeLong(metricsMap["responseEndTime"])
    val sslStartTime = ReactNativeUtils.convertToNativeLong(metricsMap["sslStartTime"])
    val sslEndTime = ReactNativeUtils.convertToNativeLong(metricsMap["sslEndTime"])

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
