package com.cloudcare.ft.mobile.sdk.tracker.reactnative;

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.utils.ReactNativeUtils;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.modules.network.OkHttpClientProvider;
import com.facebook.react.modules.network.ReactCookieJarContainer;
import com.ft.sdk.DetectFrequency;
import com.ft.sdk.FTInTakeUrlHandler;
import com.ft.sdk.FTRUMConfig;
import com.ft.sdk.FTRUMGlobalManager;
import com.ft.sdk.FTSdk;
import com.ft.sdk.RUMCacheDiscard;
import com.ft.sdk.garble.bean.AppState;
import com.ft.sdk.garble.bean.NetStatusBean;
import com.ft.sdk.garble.bean.ResourceParams;

import java.util.HashMap;
import java.util.Map;

import kotlin.text.Regex;
import okhttp3.Interceptor;
import okhttp3.OkHttpClient;

public class FTRUMModule extends ReactContextBaseJavaModule {

  private static final String DEFAULT_ERROR_TYPE = "reactnative_crash";

  public FTRUMModule(ReactApplicationContext reactContext) {
    super(reactContext);

    OkHttpClientProvider.setOkHttpClientFactory(() -> new OkHttpClient.Builder()
      .addNetworkInterceptor((Interceptor.Chain chain) -> chain.proceed(chain.request()))
      .cookieJar(new ReactCookieJarContainer())
      .build()
    );
  }

  @Override
  public String getName() {
    return "FTReactNativeRUM";
  }

  @ReactMethod
  public void setConfig(ReadableMap context, Promise promise) {
    Map<String, Object> map = context.toHashMap();
    String rumAppId = (String) map.get("androidAppId");
    Double sampleRate = (Double) map.get("sampleRate");
    Boolean enableNativeUserAction = (Boolean) map.get("enableNativeUserAction");
    Boolean enableNativeUserView = (Boolean) map.get("enableNativeUserView");
    Boolean enableNativeUserResource = (Boolean) map.get("enableNativeUserResource");
    Boolean enableResourceHostIP = (Boolean) map.get("enableResourceHostIP");
    Boolean enableTrackNativeCrash = (Boolean) map.get("enableTrackNativeCrash");
    Boolean enableTrackNativeAppANR = (Boolean) map.get("enableTrackNativeAppANR");
    Boolean enableTrackNativeFreeze = (Boolean) map.get("enableTrackNativeFreeze");
    Double nativeFreezeDurationMs = (Double) map.get("nativeFreezeDurationMs");
    Integer monitorType = ReactNativeUtils.convertToNativeInt(map.get("errorMonitorType"));
    Integer deviceMonitorType = ReactNativeUtils.convertToNativeInt(map.get("deviceMonitorType"));
    Integer detectFrequency = ReactNativeUtils.convertToNativeInt(map.get("detectFrequency"));
    Map<String, Object> globalContext = (Map<String, Object>) map.get("globalContext");
    Integer rumCacheLimitCount = ReactNativeUtils.convertToNativeInt(map.get("rumCacheLimitCount"));
    Integer rumDiscardStrategy = ReactNativeUtils.convertToNativeInt(map.get("rumDiscardStrategy"));

    FTRUMConfig rumConfig = new FTRUMConfig().setRumAppId(rumAppId);
    if (sampleRate != null) {
      rumConfig.setSamplingRate(sampleRate.floatValue());
    }
    if (enableNativeUserAction != null) {
      rumConfig.setEnableTraceUserAction(enableNativeUserAction);
    }
    if (enableNativeUserView != null) {
      rumConfig.setEnableTraceUserView(enableNativeUserView);
    }
    if (enableNativeUserResource != null) {
      rumConfig.setEnableTraceUserResource(enableNativeUserResource);
    }
    if (enableResourceHostIP != null) {
      rumConfig.setEnableResourceHostIP(enableResourceHostIP);
    }
    if (enableTrackNativeCrash != null) {
      rumConfig.setEnableTrackAppCrash(enableTrackNativeCrash);
    }
    if (enableTrackNativeFreeze != null) {
      if (nativeFreezeDurationMs != null) {
        rumConfig.setEnableTrackAppUIBlock(enableTrackNativeFreeze, nativeFreezeDurationMs.longValue());
      } else {
        rumConfig.setEnableTrackAppUIBlock(enableTrackNativeFreeze);
      }
    }
    if (enableTrackNativeAppANR != null) {
      rumConfig.setEnableTrackAppANR(enableTrackNativeAppANR);
    }
    if (monitorType != null) {
      rumConfig.setExtraMonitorTypeWithError(monitorType);
    }
    if (deviceMonitorType != null) {
      if (detectFrequency != null) {
        DetectFrequency deviceMetricsDetectFrequency;
        switch (detectFrequency) {
          case 1:
            deviceMetricsDetectFrequency = DetectFrequency.FREQUENT;
            break;
          case 2:
            deviceMetricsDetectFrequency = DetectFrequency.RARE;
            break;
          default:
            deviceMetricsDetectFrequency = DetectFrequency.DEFAULT;
            break;
        }
        rumConfig.setDeviceMetricsMonitorType(deviceMonitorType, deviceMetricsDetectFrequency);
      } else {
        rumConfig.setDeviceMetricsMonitorType(deviceMonitorType);
      }
    }
    if (globalContext != null) {
      for (Map.Entry<String, Object> entry : globalContext.entrySet()) {
        rumConfig.addGlobalContext(entry.getKey(), entry.getValue().toString());
      }
    }
    if (BuildConfig.DEBUG) {
      rumConfig.setResourceUrlHandler(new FTInTakeUrlHandler() {
        @Override
        public boolean isInTakeUrl(String url) {
          return ReactNativeUtils.isReactNativeDevUrl(url);
        }
      });
    }
    if (rumCacheLimitCount != null) {
      rumConfig.setRumCacheLimitCount(rumCacheLimitCount);
    }
    if (rumDiscardStrategy != null) {
      RUMCacheDiscard rumCacheDiscard = RUMCacheDiscard.DISCARD;
      if(rumDiscardStrategy == 1){
        rumCacheDiscard = RUMCacheDiscard.DISCARD_OLDEST;
      }
      rumConfig.setRumCacheDiscardStrategy(rumCacheDiscard);
    }
    FTSdk.initRUMWithConfig(rumConfig);
    //LogUtils.d("configCheck","rumConfig:"+new Gson().toJson(rumConfig));
    promise.resolve(null);
  }

  @ReactMethod
  public void startAction(String actionName, String actionType, ReadableMap map, Promise promise) {
    if (map != null) {
      FTRUMGlobalManager.get().startAction(actionName, actionType, map.toHashMap());
    } else {
      FTRUMGlobalManager.get().startAction(actionName, actionType);
    }
    promise.resolve(null);
  }

  @ReactMethod
  public void onCreateView(String viewName, Double duration, Promise promise) {
    FTRUMGlobalManager.get().onCreateView(viewName, duration.longValue());
    promise.resolve(null);
  }

  @ReactMethod
  public void startView(String viewName, ReadableMap map, Promise promise) {
    if (map != null) {
      FTRUMGlobalManager.get().startView(viewName, map.toHashMap());
    } else {
      FTRUMGlobalManager.get().startView(viewName);
    }
    promise.resolve(null);
  }

  @ReactMethod
  public void stopView(ReadableMap map, Promise promise) {
    if (map != null) {
      FTRUMGlobalManager.get().stopView(map.toHashMap());
    } else {
      FTRUMGlobalManager.get().stopView();
    }
    promise.resolve(null);
  }

  @ReactMethod
  public void addError(String stack, String message, ReadableMap map, Promise promise) {
    if (map != null) {
      FTRUMGlobalManager.get().addError(stack, message, DEFAULT_ERROR_TYPE, AppState.RUN, map.toHashMap());
    } else {
      FTRUMGlobalManager.get().addError(stack, message, DEFAULT_ERROR_TYPE, AppState.RUN);
    }
    promise.resolve(null);
  }

  @ReactMethod
  public void addErrorWithType(String errorType, String stack, String message, ReadableMap map, Promise promise) {
    if (map != null) {
      FTRUMGlobalManager.get().addError(stack, message, errorType, AppState.RUN, map.toHashMap());
    } else {
      FTRUMGlobalManager.get().addError(stack, message, errorType, AppState.RUN);
    }
    promise.resolve(null);
  }

  @ReactMethod
  public void startResource(String key, ReadableMap map, Promise promise) {
    if (map != null) {
      FTRUMGlobalManager.get().startResource(key, map.toHashMap());
    } else {
      FTRUMGlobalManager.get().startResource(key);
    }
    promise.resolve(null);
  }

  @ReactMethod
  public void stopResource(String key, ReadableMap map, Promise promise) {
    if (map != null) {
      FTRUMGlobalManager.get().stopResource(key, map.toHashMap());
    } else {
      FTRUMGlobalManager.get().stopResource(key);
    }
    promise.resolve(null);
  }

  @ReactMethod
  public void addResource(String key, ReadableMap resourceContext, ReadableMap metricsContext, Promise promise) {
    HashMap<String, Object> resourceMap = resourceContext.toHashMap();
    String url = (String) resourceMap.get("url");
    HashMap<String, String> responseHeader = (HashMap<String, String>) resourceMap.get("responseHeader");
    HashMap<String, String> requestHeader = (HashMap<String, String>) resourceMap.get("requestHeader");
    String method = (String) resourceMap.get("httpMethod");
    Integer resourceStatus = ReactNativeUtils.convertToNativeInt(resourceMap.get("resourceStatus"));
    String responseBody = (String) resourceMap.get("responseBody");
//    String responseConnection = (String) resourceMap.get("responseConnection");
//    String responseContentType = (String) resourceMap.get("responseContentType");
//    String responseContentEncoding = (String) resourceMap.get("responseContentEncoding");

//    HashMap<String, Object> metricsMap = metricsContext.toHashMap();
//    Long fetchStartTime = ReactNativeUtils.convertToNativeLong(metricsMap.get("fetchStartTime"));
//    Long tcpStartTime = ReactNativeUtils.convertToNativeLong(metricsMap.get("tcpStartTime"));
//    Long tcpEndTime = ReactNativeUtils.convertToNativeLong(metricsMap.get("tcpEndTime"));
//    Long dnsStartTime = ReactNativeUtils.convertToNativeLong(metricsMap.get("dnsStartTime"));
//    Long dnsEndTime = ReactNativeUtils.convertToNativeLong(metricsMap.get("dnsEndTime"));
//    Long responseStartTime = ReactNativeUtils.convertToNativeLong(metricsMap.get("responseStartTime"));
//    Long responseEndTime = ReactNativeUtils.convertToNativeLong(metricsMap.get("responseEndTime"));
//    Long sslStartTime = ReactNativeUtils.convertToNativeLong(metricsMap.get("sslStartTime"));
//    Long sslEndTime = ReactNativeUtils.convertToNativeLong(metricsMap.get("sslEndTime"));

    ResourceParams params = new ResourceParams();
    params.url =url != null ? url : "";
    params.responseHeader = responseHeader != null ? responseHeader.toString() : "";
    params.resourceMethod = method;
    params.requestHeader = requestHeader != null ? requestHeader.toString() : "";
    params.resourceStatus = resourceStatus != null ? resourceStatus : 0;
    params.responseBody = responseBody != null ? responseBody : "";
//    params.responseConnection = responseConnection != null ? responseConnection : "";
//    params.responseContentType = responseContentType != null ? responseContentType : "";
//    params.responseContentEncoding = responseContentEncoding != null ? responseContentEncoding : "";

    //not implement
    NetStatusBean netStatusBean = new NetStatusBean();
//    netStatusBean.fetchStartTime = (fetchStartTime != null ? fetchStartTime : -1L);
//    netStatusBean.tcpStartTime = (tcpStartTime != null ? tcpStartTime : -1L);
//    netStatusBean.tcpEndTime = (tcpEndTime != null ? tcpEndTime : -1L);
//    netStatusBean.dnsStartTime = (dnsStartTime != null ? dnsStartTime : -1L);
//    netStatusBean.dnsEndTime = (dnsEndTime != null ? dnsEndTime : -1L);
//    netStatusBean.responseStartTime = (responseStartTime != null ? responseStartTime : -1L);
//    netStatusBean.responseEndTime = (responseEndTime != null ? responseEndTime : -1L);
//    netStatusBean.sslStartTime = (sslStartTime != null ? sslStartTime : -1L);
//    netStatusBean.sslEndTime = (sslEndTime != null ? sslEndTime : -1L);

    FTRUMGlobalManager.get().addResource(key, params, netStatusBean);
    promise.resolve(null);
  }

}
