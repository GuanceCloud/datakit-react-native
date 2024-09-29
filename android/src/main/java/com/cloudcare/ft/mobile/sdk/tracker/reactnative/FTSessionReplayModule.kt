package com.cloudcare.ft.mobile.sdk.tracker.reactnative

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.ReactNativeSessionReplayExtensionSupport
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.utils.ReactNativeUtils
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.ft.sdk.FTSdk
import com.ft.sdk.SessionReplayManager
import com.ft.sdk.sessionreplay.FTSessionReplayConfig
import com.ft.sdk.sessionreplay.SessionReplayPrivacy

class FTSessionReplayModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String {
    return "FTReactNativeSessionReplay"
  }

  @ReactMethod
  fun sessionReplayConfig(context: ReadableMap, promise: Promise) {
    val map = context.toHashMap()

    val sampleRate = map["sampleRate"] as Double?
    val privacy = ReactNativeUtils.convertToNativeInt(map["privacy"])
    val sessionReplayConfig = FTSessionReplayConfig()

    if (sampleRate != null) {
      sessionReplayConfig.sampleRate = sampleRate.toFloat()
    }

    val sessionReplayPrivacy: SessionReplayPrivacy =
      when (privacy) {
        0 -> SessionReplayPrivacy.MASK
        1 -> SessionReplayPrivacy.ALLOW
        2 -> SessionReplayPrivacy.MASK_USER_INPUT
        else -> SessionReplayPrivacy.MASK
      }
    sessionReplayConfig.privacy = sessionReplayPrivacy
    sessionReplayConfig.addExtensionSupport(
      ReactNativeSessionReplayExtensionSupport(
        reactApplicationContext,
        SessionReplayManager.get().internalLogger
      )
    ).setDelayInit(true)
    FTSdk.initSessionReplayConfig(sessionReplayConfig)
    promise.resolve(null)
  }

}
