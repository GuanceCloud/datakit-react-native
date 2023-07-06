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
    val serverUrl = map["serverUrl"] as String
    val debug = map["debug"] as Boolean?
    val env = ReactNativeUtils.convertToNativeInt(map["env"])
    val serviceName = map["service"] as String?
    val globalContext = map["globalContext"] as HashMap<String, Any>?


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
    val sdkConfig = FTSDKConfig.builder(serverUrl).setEnv(envType)
    if (debug != null) {
      sdkConfig.isDebug = debug
    }
    if (serviceName != null) {
      sdkConfig.serviceName = serviceName;
    }

    globalContext?.forEach {
      sdkConfig.addGlobalContext(it.key, it.value.toString())
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


}
