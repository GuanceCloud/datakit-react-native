package com.cloudcare.ft.mobile.sdk.tracker.reactnative

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.utils.ReactNativeUtils
import com.facebook.react.bridge.*
import com.ft.sdk.FTLogger
import com.ft.sdk.FTLoggerConfig
import com.ft.sdk.FTSdk
import com.ft.sdk.LogCacheDiscard
import com.ft.sdk.garble.bean.Status

class FTLogModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String {
    return "FTReactNativeLog"
  }

  @ReactMethod
  fun logConfig(context: ReadableMap, promise: Promise) {

    val map = context.toHashMap();
    val discardStrategy = ReactNativeUtils.convertToNativeInt(map["discardStrategy"])
    val sampleRate = map["sampleRate"] as Float?
    val logTypeReadArr = map["logTypeArr"] as ReadableArray?
    val enableLinkRumData = map["enableLinkRumData"] as Boolean?
    val enableCustomLog = map["enableCustomLog"] as Boolean?
    val globalContext = map["globalContext"] as HashMap<String, Any>?

    val logCacheDiscard: LogCacheDiscard =
      when (discardStrategy) {
        0 -> LogCacheDiscard.DISCARD
        1 -> LogCacheDiscard.DISCARD_OLDEST
        else -> LogCacheDiscard.DISCARD
      }

    val logConfig = FTLoggerConfig()
      .setEnableCustomLog(true)
      .setLogCacheDiscardStrategy(logCacheDiscard)

    if (sampleRate != null) {
      logConfig.samplingRate = sampleRate
    }

    val logTypeArr = logTypeReadArr?.toArrayList()

    if (logTypeArr != null) {
      val arr: Array<Status?> = arrayOfNulls(logTypeArr.size)

      logTypeArr.forEachIndexed { index, it ->
        arr[index] = Status.values().find { status -> it == status.ordinal }!!
      }
      logConfig.setLogLevelFilters(arr)
    }

    if (enableLinkRumData != null) {
      logConfig.isEnableLinkRumData = enableLinkRumData
    }
    if (enableCustomLog != null) {
      logConfig.isEnableCustomLog = enableCustomLog
    }

    globalContext?.forEach {
      logConfig.addGlobalContext(it.key, it.value.toString())
    }


    FTSdk.initLogWithConfig(logConfig)

    promise.resolve(null)

  }

  @ReactMethod
  fun logging(content: String, logStatus: Int, map: ReadableMap?, promise: Promise) {

    val status: Status = when (logStatus) {
      0 -> Status.INFO
      1 -> Status.WARNING
      2 -> Status.ERROR
      3 -> Status.CRITICAL
      4 -> Status.OK
      else -> Status.INFO
    }
    if (map == null) {
      FTLogger.getInstance().logBackground(content, status)
    } else {
      FTLogger.getInstance().logBackground(content, status, map.toHashMap())
    }
    promise.resolve(null)

  }


}
