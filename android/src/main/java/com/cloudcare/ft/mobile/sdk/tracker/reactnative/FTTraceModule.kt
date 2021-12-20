package com.cloudcare.ft.mobile.sdk.tracker.reactnative

import com.facebook.react.bridge.*
import com.ft.sdk.FTSdk
import com.ft.sdk.FTTraceConfig
import com.ft.sdk.FTTraceManager
import com.ft.sdk.TraceType

class FTTraceModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String {
    return "FTReactNativeTrace"
  }

  @ReactMethod
  fun setConfig(context: ReadableMap, promise: Promise) {
    val map = context.toHashMap()
    val sampleRate = map["sampleRate"] as Float?
    val traceType = map["traceType"] as Int?
    val enableLinkRUMData = map["enableLinkRUMData"] as Boolean?
    val enableNativeAutoTrace = map["enableNativeAutoTrace"] as Boolean?
    val serviceName = map["serviceName"] as String?
    val traceConfig = FTTraceConfig()
    if (sampleRate != null) {
      traceConfig.samplingRate = sampleRate
    }

    if (traceType != null) {
      traceConfig.traceType = when (traceType) {
        0 -> TraceType.DDTRACE
        1 -> TraceType.ZIPKIN
        else -> TraceType.JAEGER
      }
    }

    if (enableLinkRUMData != null) {
      traceConfig.isEnableLinkRUMData = enableLinkRUMData
    }

    if (enableNativeAutoTrace != null) {
      traceConfig.isEnableAutoTrace = enableNativeAutoTrace
    }

    if (serviceName != null) {
      traceConfig.serviceName = serviceName
    }

    FTSdk.initTraceWithConfig(traceConfig)

    promise.resolve(null)
  }

  @ReactMethod
  fun addTrace(
    key: String,
    httpMethod: String,
    requestHeader: ReadableMap,
    context: ReadableMap, promise: Promise
  ) {
    val map = context.toHashMap()
    val requestHeaderMap = HashMap<String, String>()
    requestHeader.toHashMap().forEach {
      requestHeaderMap[it.key] = it.value.toString()
    }

    val statusCode = map["statusCode"] as Int?
    val responseHeader = map["responseHeader"] as ReadableMap?
    val responseHeaderMap = HashMap<String, String>()

    responseHeader?.toHashMap()?.forEach {
      requestHeaderMap[it.key] = it.value.toString()
    }
    val errorMsg = map["errorMsg"] as String?

    FTTraceManager.get().addTrace(key, httpMethod, requestHeaderMap, responseHeaderMap, statusCode
      ?: 0, errorMsg)
    promise.resolve(null)
  }

  @ReactMethod
  fun getTraceHeader(key: String, url: String, promise: Promise) {
    promise.resolve(FTTraceManager.get().getTraceHeader(key, url))
  }
}
