package com.cloudcare.ft.mobile.sdk.tracker.reactnative

import android.util.Log
import com.facebook.react.bridge.*
import com.ft.sdk.EnvType
import com.ft.sdk.FTSDKConfig
import com.ft.sdk.FTSdk

class FTMobileModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String {
    return "FTMobileReactNative"
  }

  @ReactMethod
  fun sdkConfig(serverUrl: String, context: ReadableMap, promise: Promise) {
    val map = context.toHashMap()
    val debug = map["debug"] as Boolean?
    val datakitUUID = map["datakitUUID"] as String?
    val env = map["env"] as Int?
    val useOAID = map["useOAID"] as Boolean?

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
    if (datakitUUID != null) {
      sdkConfig.setXDataKitUUID(datakitUUID)
    }
    if (useOAID != null) {
      sdkConfig.isUseOAID = useOAID
    }

    FTSdk.install(sdkConfig)

    promise.resolve(null)
  }

  @ReactMethod
  fun bindRUMUserData(userId: String, promise: Promise) {
    FTSdk.bindRumUserData(userId)
    promise.resolve(null)

  }

  @ReactMethod
  fun unbindRUMUserData(promise: Promise) {
    FTSdk.unbindRumUserData()
    promise.resolve(null)

  }

  @ReactMethod
  fun testMethod(context: ReadableMap, promise: Promise) {
    Log.e("test", context.toString())
    promise.resolve(4)
  }


}
