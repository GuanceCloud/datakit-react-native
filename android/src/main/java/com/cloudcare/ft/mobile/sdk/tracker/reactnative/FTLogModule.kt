package com.cloudcare.ft.mobile.sdk.tracker.reactnative

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
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
  fun logConfig(
    sampleRate: Float?,
    serviceName: String?,
    enableLinkRumData: Boolean?,
    enableCustomLog: Boolean?, discardStrategy: Int?,
    logTypeArr: List<Int>?,
    promise: Promise
  ) {

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
    if (serviceName != null) {
      logConfig.serviceName = serviceName
    }

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


    FTSdk.initLogWithConfig(logConfig)

    promise.resolve(null)

  }

  @ReactMethod
  fun logging(content: String, logStatus: Int, promise: Promise) {

    val status: Status = when (logStatus) {
      0 -> Status.INFO
      1 -> Status.WARNING
      2 -> Status.ERROR
      3 -> Status.CRITICAL
      4 -> Status.OK
      else -> Status.INFO
    }
    FTLogger.getInstance().logBackground(content, status)
    promise.resolve(null)

  }


}
