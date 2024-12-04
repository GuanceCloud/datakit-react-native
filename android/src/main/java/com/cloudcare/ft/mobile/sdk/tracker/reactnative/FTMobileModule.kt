package com.cloudcare.ft.mobile.sdk.tracker.reactnative

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.utils.ReactNativeUtils
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.ft.sdk.EnvType
import com.ft.sdk.FTSDKConfig
import com.ft.sdk.FTSdk
import com.ft.sdk.garble.bean.UserData

class FTMobileModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return "FTMobileReactNative"
  }

  @ReactMethod
  fun sdkConfig(context: ReadableMap, promise: Promise) {
    val map = context.toHashMap()
    val datakitUrl = map["datakitUrl"] as String?
    val datawayUrl = map["datawayUrl"] as String?
    val cliToken = map["clientToken"] as String?
    val debug = map["debug"] as Boolean?
    val autoSync = map["autoSync"] as Boolean?
    val syncPageSize = ReactNativeUtils.convertToNativeInt(map["syncPageSize"])
    val syncSleepTime = ReactNativeUtils.convertToNativeInt(map["syncSleepTime"])
    val enableDataIntegerCompatible = map["enableDataIntegerCompatible"] as Boolean?
    val compressIntakeRequests = map["compressIntakeRequests"] as Boolean?
    val env = ReactNativeUtils.convertToNativeInt(map["envType"])
    val serviceName = map["service"] as String?
    val globalContext = map["globalContext"] as HashMap<String, Any>?

    val sdkConfig =
      if (datakitUrl != null) FTSDKConfig.builder(datakitUrl) else FTSDKConfig.builder(
        datawayUrl,
        cliToken
      )
    if (env != null) {
      val envType: EnvType = when (env) {
        EnvType.PROD.ordinal -> {
          EnvType.PROD
        }
        EnvType.GRAY.ordinal -> {
          EnvType.GRAY
        }
        EnvType.PRE.ordinal -> {
          EnvType.PRE
        }
        EnvType.COMMON.ordinal -> {
          EnvType.COMMON
        }
        EnvType.LOCAL.ordinal -> {
          EnvType.LOCAL
        }
        else -> EnvType.PROD
      }
      sdkConfig.setEnv(envType)
    }

    val envString = map["env"] as String?
    if (envString != null) {
       sdkConfig.env = envString
    }

    if (debug != null) {
      sdkConfig.isDebug = debug
    }
    if (serviceName != null) {
      sdkConfig.serviceName = serviceName;
    }
    if (autoSync != null) {
      sdkConfig.isAutoSync = autoSync
    }
    if (syncPageSize != null) {
      sdkConfig.setCustomSyncPageSize(syncPageSize)
    }
    if (syncSleepTime != null) {
      sdkConfig.setSyncSleepTime(syncSleepTime)
    }
    if (enableDataIntegerCompatible != null && enableDataIntegerCompatible) {
      sdkConfig.enableDataIntegerCompatible()
    }
    if (compressIntakeRequests != null && compressIntakeRequests) {
      sdkConfig.setCompressIntakeRequests(compressIntakeRequests)
    }
    globalContext?.let {
      for ((key, value) in it) {
        sdkConfig.addGlobalContext(key, value.toString())
      }
    }

    FTSdk.install(sdkConfig)

    promise.resolve(null)
  }

  @ReactMethod
  fun bindRUMUserData(
    userId: String,
    userName: String?,
    userEmail: String?,
    extra: ReadableMap?,
    promise: Promise
  ) {
    val userData = UserData()
    userData.id = userId
    userData.email = userEmail
    userData.name = userName

    val convertedMap = HashMap<String, String>()

    extra?.let {
      for ((key, value) in extra.toHashMap()) {
        if (value is String) {
          convertedMap[key] = value
        } else {
          convertedMap[key] = value.toString()
        }
      }
    }

    userData.exts = convertedMap
    FTSdk.bindRumUserData(userData)
    promise.resolve(null)

  }

  @ReactMethod
  fun unbindRUMUserData(promise: Promise) {
    FTSdk.unbindRumUserData()
    promise.resolve(null)

  }

  @ReactMethod
  fun flushSyncData(promise: Promise){
    FTSdk.flushSyncData()
    promise.resolve(null)
  }

  @ReactMethod
  fun appendGlobalContext(
    extra: ReadableMap?,
    promise: Promise
  ) {
    extra?.let {
      FTSdk.appendGlobalContext(extra.toHashMap())
    }
    promise.resolve(null)

  }

  @ReactMethod
  fun appendLogGlobalContext(
    extra: ReadableMap?,
    promise: Promise
  ) {
    extra?.let {
      FTSdk.appendLogGlobalContext(extra.toHashMap())
    }
    promise.resolve(null)

  }

  @ReactMethod
  fun appendRUMGlobalContext(
    extra: ReadableMap?,
    promise: Promise
  ) {
    extra?.let {
      FTSdk.appendRUMGlobalContext(extra.toHashMap())
    }
    promise.resolve(null)

  }

  @ReactMethod
  fun shutDown(
    promise: Promise
  ) {
    FTSdk.shutDown()
    promise.resolve(null)
  }

  @ReactMethod
  fun clearAllData(
    promise: Promise
  ) {
    FTSdk.clearAllData()
    promise.resolve(null)
  }

}
