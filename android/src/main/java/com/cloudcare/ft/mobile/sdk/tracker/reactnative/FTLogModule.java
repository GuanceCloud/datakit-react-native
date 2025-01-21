package com.cloudcare.ft.mobile.sdk.tracker.reactnative;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.utils.ReactNativeUtils;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.ft.sdk.FTLogger;
import com.ft.sdk.FTLoggerConfig;
import com.ft.sdk.FTSdk;
import com.ft.sdk.LogCacheDiscard;
import com.ft.sdk.garble.bean.Status;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class FTLogModule extends ReactContextBaseJavaModule {

  public FTLogModule(@Nullable ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @NonNull
  @Override
  public String getName() {
    return "FTReactNativeLog";
  }

  @ReactMethod
    public void logConfig(ReadableMap context, Promise promise) {
        Map<String, Object> map = context.toHashMap();
        Integer discardStrategy = ReactNativeUtils.convertToNativeInt(map.get("discardStrategy"));
        Double sampleRate = (Double) map.get("sampleRate");
        ArrayList<Object> logTypeReadArr = (ArrayList<Object>) map.get("logLevelFilters");
        Boolean enableLinkRumData = (Boolean) map.get("enableLinkRumData");
        Boolean enableCustomLog = (Boolean) map.get("enableCustomLog");
        HashMap<String, Object> globalContext = (HashMap<String, Object>) map.get("globalContext");
        Integer logCacheLimitCount = ReactNativeUtils.convertToNativeInt(map.get("logCacheLimitCount"));

        LogCacheDiscard logCacheDiscard;
        if (discardStrategy == null) {
            logCacheDiscard = LogCacheDiscard.DISCARD;
        } else {
            switch (discardStrategy) {
                case 0:
                    logCacheDiscard = LogCacheDiscard.DISCARD;
                    break;
                case 1:
                    logCacheDiscard = LogCacheDiscard.DISCARD_OLDEST;
                    break;
                default:
                    logCacheDiscard = LogCacheDiscard.DISCARD;
                    break;
            }
        }

        FTLoggerConfig logConfig = new FTLoggerConfig()
                .setLogCacheDiscardStrategy(logCacheDiscard);

        if (sampleRate != null) {
            logConfig.setSamplingRate(sampleRate.floatValue());
        }

        if (logTypeReadArr != null) {
            ArrayList<Object> logTypeList = logTypeReadArr;
            Status[] arr = new Status[logTypeList.size()];
            for (int i = 0; i < logTypeList.size(); i++) {
              Object item = logTypeList.get(i);
              int ordinal = ReactNativeUtils.convertToNativeInt(item);
              if(ordinal>Status.INFO.ordinal()){
                arr[i] = Status.values()[ordinal+1];// Android 多一个 Debug
              }else{
                arr[i] = Status.values()[ordinal];
              }
            }
            logConfig.setLogLevelFilters(arr);
        }

        if (enableLinkRumData != null) {
            logConfig.setEnableLinkRumData(enableLinkRumData);
        }

        if (enableCustomLog != null) {
            logConfig.setEnableCustomLog(enableCustomLog);
        }

        if (globalContext != null) {
            for (Map.Entry<String, Object> entry : globalContext.entrySet()) {
                logConfig.addGlobalContext(entry.getKey(), entry.getValue().toString());
            }
        }

        if (logCacheLimitCount != null) {
            logConfig.setLogCacheLimitCount(logCacheLimitCount);
        }

        FTSdk.initLogWithConfig(logConfig);
//        LogUtils.d("configCheck","logConfig:"+new Gson().toJson(logConfig));
        promise.resolve(null);
    }

    @ReactMethod
    public void logging(String content, int logStatus, ReadableMap map, Promise promise) {
        Status status;
        switch (logStatus) {
            case 0:
                status = Status.INFO;
                break;
            case 1:
                status = Status.WARNING;
                break;
            case 2:
                status = Status.ERROR;
                break;
            case 3:
                status = Status.CRITICAL;
                break;
            case 4:
                status = Status.OK;
                break;
            default:
                status = Status.INFO;
                break;
        }

        if (map == null) {
            FTLogger.getInstance().logBackground(content, status);
        } else {
            FTLogger.getInstance().logBackground(content, status, map.toHashMap());
        }
        promise.resolve(null);
    }

    @ReactMethod
    public void logWithStatusString(String content, String logStatus, ReadableMap map, Promise promise) {
        if (map == null) {
            FTLogger.getInstance().logBackground(content, logStatus);
        } else {
            FTLogger.getInstance().logBackground(content, logStatus, map.toHashMap());
        }
        promise.resolve(null);
    }
}
