package com.cloudcare.ft.mobile.sdk.tracker.reactnative

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.utils.ReactNativeUtils
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
    val traceType = ReactNativeUtils.convertToNativeInt(map["traceType"])
    val enableLinkRUMData = map["enableLinkRUMData"] as Boolean?
    val enableNativeAutoTrace = map["enableNativeAutoTrace"] as Boolean?
//    val serviceName = map["serviceName"] as String?
    val traceConfig = FTTraceConfig()
    if (sampleRate != null) {
      traceConfig.samplingRate = sampleRate
    }

    if (traceType != null) {
      traceConfig.traceType = when (traceType) {
        0 -> TraceType.DDTRACE
        1 -> TraceType.ZIPKIN_MULTI_HEADER
        2 -> TraceType.ZIPKIN_SINGLE_HEADER
        3 -> TraceType.TRACEPARENT
        4 -> TraceType.SKYWALKING
        5 -> TraceType.JAEGER
        else -> TraceType.JAEGER
      }
    }

    if (enableLinkRUMData != null) {
      traceConfig.isEnableLinkRUMData = enableLinkRUMData
    }

    if (enableNativeAutoTrace != null) {
      traceConfig.isEnableAutoTrace = enableNativeAutoTrace
    }

//    if (serviceName != null) {
//      traceConfig.serviceName = serviceName
//    }

    FTSdk.initTraceWithConfig(traceConfig)

    promise.resolve(null)
  }

//  @ReactMethod
//  fun addTrace(
//    key: String,
//    context: ReadableMap, promise: Promise
//  ) {
//    val map = context.toHashMap()
//    val requestHeader = map["requestHeader"] as HashMap<String, String>
//    val httpMethod = map["httpMethod"] as String
//    val statusCode = ReactNativeUtils.convertToNativeInt(map["statusCode"])
//    val responseHeader = map["responseHeader"] as HashMap<String, String>?
//    val errorMsg = map["errorMsg"] as String?
//    FTTraceManager.get().addTrace(key, httpMethod, requestHeader, responseHeader,
//      statusCode ?: 0, errorMsg)
//    promise.resolve(null)
//  }

  @ReactMethod
  fun getTraceHeader(key: String, url: String, promise: Promise) {
    val hashMap = FTTraceManager.get().getTraceHeader(key, url)
    val map = WritableNativeMap()
    hashMap.forEach {
      map.putString(it.key, it.value)
    }
    promise.resolve(map)
  }
}
