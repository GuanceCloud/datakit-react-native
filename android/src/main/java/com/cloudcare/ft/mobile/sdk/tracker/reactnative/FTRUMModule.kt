package com.cloudcare.ft.mobile.sdk.tracker.reactnative

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.utils.ReactNativeUtils
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.network.OkHttpClientProvider
import com.facebook.react.modules.network.ReactCookieJarContainer
import com.ft.sdk.DetectFrequency
import com.ft.sdk.FTRUMConfig
import com.ft.sdk.FTRUMGlobalManager
import com.ft.sdk.FTSdk
import com.ft.sdk.garble.bean.AppState
import com.ft.sdk.garble.bean.NetStatusBean
import com.ft.sdk.garble.bean.ResourceParams
import okhttp3.Interceptor
import okhttp3.OkHttpClient

class FTRUMModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
  companion object {
    val RN_DEV_INNER_URL_REGEX = arrayOf(
      Regex("^http://((10|172|192).[0-9]+.[0-9]+.[0-9]+|localhost|127.0.0.1):808[0-9]/logs$"),//expo
      Regex("^http://localhost:808[0-9]/(hot|symbolicate|message|inspector).*$")//rn
    )
    private const val DEFAULT_ERROR_TYPE = "reactnative_crash"
  }

  init {
    OkHttpClientProvider.setOkHttpClientFactory {
      OkHttpClient.Builder()
        .addNetworkInterceptor(Interceptor { chain ->
          chain.proceed(chain.request())
        })
        .cookieJar(ReactCookieJarContainer())
        .build()
    }

  }

  override fun getName(): String {
    return "FTReactNativeRUM"
  }

  //是否是 debug 发送网络请求
  private fun isDevUrl(text: String, regexArray: Array<Regex>): Boolean {
    return regexArray.any { it.matches(text) }
  }

  @ReactMethod
  fun setConfig(context: ReadableMap, promise: Promise) {
    val map = context.toHashMap()
    val rumAppId = map["androidAppId"] as String
    val sampleRate = map["sampleRate"] as Double?
    val enableNativeUserAction = map["enableNativeUserAction"] as Boolean?
    val enableNativeUserView = map["enableNativeUserView"] as Boolean?
    val enableNativeUserResource = map["enableNativeUserResource"] as Boolean?
    val enableResourceHostIP = map["enableResourceHostIP"] as Boolean?
    val enableTrackNativeCrash = map["enableTrackNativeCrash"] as Boolean?
    val enableTrackNativeAppANR = map["enableTrackNativeAppANR"] as Boolean?
    val enableTrackNativeFreeze = map["enableTrackNativeFreeze"] as Boolean?
    val nativeFreezeDurationMs = map["nativeFreezeDurationMs"] as Double?
    val monitorType = ReactNativeUtils.convertToNativeInt(map["errorMonitorType"])
    val deviceMonitorType = ReactNativeUtils.convertToNativeInt(map["deviceMonitorType"])
    val detectFrequency = ReactNativeUtils.convertToNativeInt(map["detectFrequency"])
    val globalContext = map["globalContext"] as HashMap<String, Any>?

    val rumConfig = FTRUMConfig().setRumAppId(rumAppId)
    if (sampleRate != null) {
      rumConfig.samplingRate = sampleRate.toFloat()
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
    if (enableResourceHostIP != null) {
      rumConfig.isEnableResourceHostIP = enableResourceHostIP
    }

    if (enableTrackNativeCrash != null) {
      rumConfig.isEnableTrackAppCrash = enableTrackNativeCrash
    }

    if (enableTrackNativeFreeze != null) {
      if (nativeFreezeDurationMs != null) {
        rumConfig.setEnableTrackAppUIBlock(enableTrackNativeFreeze, nativeFreezeDurationMs.toLong())
      } else {
        rumConfig.isEnableTrackAppUIBlock = enableTrackNativeFreeze
      }
    }

    if (enableTrackNativeAppANR != null) {
      rumConfig.isEnableTrackAppANR = enableTrackNativeAppANR
    }

    if (monitorType != null) {
      rumConfig.extraMonitorTypeWithError = monitorType
    }
    if (deviceMonitorType != null) {

      if (detectFrequency != null) {
        val deviceMetricsDetectFrequency: DetectFrequency = when (detectFrequency) {
          0 -> DetectFrequency.DEFAULT
          1 -> DetectFrequency.FREQUENT
          2 -> DetectFrequency.RARE
          else -> DetectFrequency.DEFAULT
        }
        rumConfig.setDeviceMetricsMonitorType(deviceMonitorType, deviceMetricsDetectFrequency)

      } else {
        rumConfig.deviceMetricsMonitorType = deviceMonitorType;
      }
    }

    globalContext?.let {
      for ((key, value) in it) {
        rumConfig.addGlobalContext(key, value.toString())
      }
    }
    if (BuildConfig.DEBUG) {
      rumConfig.setResourceUrlHandler { url ->
        return@setResourceUrlHandler isDevUrl(url, RN_DEV_INNER_URL_REGEX)
      }
    }

    FTSdk.initRUMWithConfig(rumConfig)
    promise.resolve(null)
  }

  @ReactMethod
  fun startAction(actionName: String, actionType: String, map: ReadableMap?, promise: Promise) {
    if (map != null) {
      FTRUMGlobalManager.get().startAction(actionName, actionType, map.toHashMap())
    } else {
      FTRUMGlobalManager.get().startAction(actionName, actionType)
    }
    promise.resolve(null)

  }

  @ReactMethod
  fun onCreateView(viewName: String, duration: Double, promise: Promise) {
    FTRUMGlobalManager.get().onCreateView(viewName, duration.toLong())
    promise.resolve(null)
  }

  @ReactMethod
  fun startView(viewName: String, map: ReadableMap?, promise: Promise) {
    if (map != null) {
      FTRUMGlobalManager.get().startView(viewName, map.toHashMap())
    } else {
      FTRUMGlobalManager.get().startView(viewName)
    }
    promise.resolve(null)
  }

  @ReactMethod
  fun stopView(map: ReadableMap?, promise: Promise) {
    if (map != null) {
      FTRUMGlobalManager.get().stopView(map.toHashMap())
    } else {
      FTRUMGlobalManager.get().stopView()
    }
    promise.resolve(null)
  }

  @ReactMethod
  fun addError(stack: String, message: String, map: ReadableMap?, promise: Promise) {
    if (map != null) {
      FTRUMGlobalManager.get()
        .addError(stack, message, DEFAULT_ERROR_TYPE, AppState.RUN, map.toHashMap())
    } else {
      FTRUMGlobalManager.get().addError(stack, message, DEFAULT_ERROR_TYPE,AppState.RUN)
    }
    promise.resolve(null)
  }

  @ReactMethod
  fun addErrorWithType(
    errorType: String,
    stack: String,
    message: String,
    map: ReadableMap?,
    promise: Promise
  ) {
    if (map != null) {
      FTRUMGlobalManager.get()
        .addError(stack, message, errorType, AppState.RUN, map.toHashMap())
    } else {
      FTRUMGlobalManager.get().addError(stack, message, errorType, AppState.RUN)
    }
    promise.resolve(null)
  }

  @ReactMethod
  fun startResource(key: String, map: ReadableMap?, promise: Promise) {
    if (map != null) {
      FTRUMGlobalManager.get().startResource(key, map.toHashMap())
    } else {
      FTRUMGlobalManager.get().startResource(key)

    }
    promise.resolve(null)
  }

  @ReactMethod
  fun stopResource(key: String, map: ReadableMap?, promise: Promise) {
    if (map != null) {
      FTRUMGlobalManager.get().stopResource(key, map.toHashMap())
    } else {
      FTRUMGlobalManager.get().stopResource(key)
    }
    promise.resolve(null)
  }

  @ReactMethod
  fun addResource(
    key: String,
    resourceContext: ReadableMap,
    metricsContext: ReadableMap,
    promise: Promise
  ) {
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
