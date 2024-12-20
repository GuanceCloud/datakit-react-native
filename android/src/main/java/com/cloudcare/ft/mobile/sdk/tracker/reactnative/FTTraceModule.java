package com.cloudcare.ft.mobile.sdk.tracker.reactnative;

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.utils.ReactNativeUtils;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableNativeMap;
import com.ft.sdk.FTSdk;
import com.ft.sdk.FTTraceConfig;
import com.ft.sdk.FTTraceManager;
import com.ft.sdk.TraceType;

import java.net.MalformedURLException;
import java.net.URISyntaxException;
import java.util.HashMap;
import java.util.Map;

public class FTTraceModule extends ReactContextBaseJavaModule {
  private static final String TAG = "FTTraceModule";

  public FTTraceModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return "FTReactNativeTrace";
  }

  @ReactMethod
  public void setConfig(ReadableMap context, Promise promise) {
    Map<String, Object> map = context.toHashMap();
    Double sampleRate = (Double) map.get("sampleRate");
    Integer traceType = ReactNativeUtils.convertToNativeInt(map.get("traceType"));
    Boolean enableLinkRUMData = (Boolean) map.get("enableLinkRUMData");
    Boolean enableNativeAutoTrace = (Boolean) map.get("enableNativeAutoTrace");

    FTTraceConfig traceConfig = new FTTraceConfig();
    if (sampleRate != null) {
      traceConfig.setSamplingRate(sampleRate.floatValue());
    }

    if (traceType != null) {
      switch (traceType) {
        case 0:
          traceConfig.setTraceType(TraceType.DDTRACE);
          break;
        case 1:
          traceConfig.setTraceType(TraceType.ZIPKIN_MULTI_HEADER);
          break;
        case 2:
          traceConfig.setTraceType(TraceType.ZIPKIN_SINGLE_HEADER);
          break;
        case 3:
          traceConfig.setTraceType(TraceType.TRACEPARENT);
          break;
        case 4:
          traceConfig.setTraceType(TraceType.SKYWALKING);
          break;
        case 5:
          traceConfig.setTraceType(TraceType.JAEGER);
          break;
        default:
          traceConfig.setTraceType(TraceType.JAEGER);
          break;
      }
    }

    if (enableLinkRUMData != null) {
      traceConfig.setEnableLinkRUMData(enableLinkRUMData);
    }

    if (enableNativeAutoTrace != null) {
      traceConfig.setEnableAutoTrace(enableNativeAutoTrace);
    }

    FTSdk.initTraceWithConfig(traceConfig);
    //LogUtils.d("configCheck","traceConfig:"+new Gson().toJson(traceConfig));
    promise.resolve(null);
  }

  @ReactMethod
  public void getTraceHeaderFields(String url, String key, Promise promise) {
    HashMap<String, String> hashMap = null;
    try {
      if (key == null) {
        hashMap = FTTraceManager.get().getTraceHeader(url);
      } else {
        hashMap = FTTraceManager.get().getTraceHeader(key, url);
      }
    } catch (MalformedURLException e) {
      LogUtils.e(TAG, LogUtils.getStackTraceString(e));
    } catch (URISyntaxException e) {
      LogUtils.e(TAG, LogUtils.getStackTraceString(e));
    }

    WritableNativeMap map = new WritableNativeMap();
    if (hashMap != null) {
      for (Map.Entry<String, String> entry : hashMap.entrySet()) {
        map.putString(entry.getKey(), entry.getValue());
      }
    }
    promise.resolve(map);
  }
}
