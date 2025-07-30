package com.ft.sdk.reactnative;

import static com.ft.sdk.garble.utils.Constants.FT_LOG_DEFAULT_MEASUREMENT;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;
import com.ft.sdk.DBCacheDiscard;
import com.ft.sdk.EnvType;
import com.ft.sdk.FTSDKConfig;
import com.ft.sdk.FTSdk;
import com.ft.sdk.InnerClassProxy;
import com.ft.sdk.LineDataModifier;
import com.ft.sdk.garble.bean.UserData;
import com.ft.sdk.DataModifier;
import com.ft.sdk.reactnative.utils.ReactNativeUtils;

import java.util.HashMap;
import java.util.Map;

public class FTMobileImpl {
    public static final String NAME = "FTMobileReactNative";

    public void sdkConfig(ReadableMap context, Promise promise) {
        Map<String, Object> map = context.toHashMap();
        String datakitUrl = (String) map.get("datakitUrl");
        String datawayUrl = (String) map.get("datawayUrl");
        String cliToken = (String) map.get("clientToken");
        Boolean debug = (Boolean) map.get("debug");
        Boolean autoSync = (Boolean) map.get("autoSync");
        Integer syncPageSize = ReactNativeUtils.convertToNativeInt(map.get("syncPageSize"));
        Integer syncSleepTime = ReactNativeUtils.convertToNativeInt(map.get("syncSleepTime"));
        Boolean enableDataIntegerCompatible = (Boolean) map.get("enableDataIntegerCompatible");
        Boolean compressIntakeRequests = (Boolean) map.get("compressIntakeRequests");
        Integer env = ReactNativeUtils.convertToNativeInt(map.get("envType"));
        String serviceName = (String) map.get("service");
        Map<String, Object> globalContext = (Map<String, Object>) map.get("globalContext");
        Boolean enableLimitWithDbSize = (Boolean) map.get("enableLimitWithDbSize");
        Long dbCacheLimit = ReactNativeUtils.convertToNativeLong(map.get("dbCacheLimit"));
        Integer dbDiscardStrategy = ReactNativeUtils.convertToNativeInt(map.get("dbDiscardStrategy"));
        String sdkPkgInfo = (String)map.get("pkgInfo");
        Map<String, Object> dataModifier = (Map<String, Object>) map.get("dataModifier");
        Map<String, Map<String,Object>> lineDataModifier = (Map<String, Map<String,Object>>) map.get("lineDataModifier");

        FTSDKConfig sdkConfig = (datakitUrl != null)
            ? FTSDKConfig.builder(datakitUrl)
            : FTSDKConfig.builder(datawayUrl, cliToken);

        if (env != null) {
            EnvType envType;
            switch (env) {
                case 1: envType = EnvType.GRAY; break;
                case 2: envType = EnvType.PRE; break;
                case 3: envType = EnvType.COMMON; break;
                case 4: envType = EnvType.LOCAL; break;
                default: envType = EnvType.PROD; break;
            }
            sdkConfig.setEnv(envType);
        }

        String envString = (String) map.get("env");
        if (envString != null) {
            sdkConfig.setEnv(envString);
        }

        if (debug != null) {
            sdkConfig.setDebug(debug);
        }
        if (serviceName != null) {
            sdkConfig.setServiceName(serviceName);
        }
        if (autoSync != null) {
            sdkConfig.setAutoSync(autoSync);
        }
        if (syncPageSize != null) {
            sdkConfig.setCustomSyncPageSize(syncPageSize);
        }
        if (syncSleepTime != null) {
            sdkConfig.setSyncSleepTime(syncSleepTime);
        }
        if (enableDataIntegerCompatible != null && enableDataIntegerCompatible) {
            sdkConfig.enableDataIntegerCompatible();
        }
        if (compressIntakeRequests != null && compressIntakeRequests) {
            sdkConfig.setCompressIntakeRequests(compressIntakeRequests);
        }
        if (globalContext != null) {
            for (Map.Entry<String, Object> entry : globalContext.entrySet()) {
                sdkConfig.addGlobalContext(entry.getKey(), entry.getValue().toString());
            }
        }
        if (enableLimitWithDbSize != null && enableLimitWithDbSize) {
          if (dbCacheLimit != null) {
            sdkConfig.enableLimitWithDbSize(dbCacheLimit);
          } else {
            sdkConfig.enableLimitWithDbSize();
          }
        }
        if (dbDiscardStrategy != null) {
          DBCacheDiscard dbCacheDiscard = DBCacheDiscard.DISCARD;
          if (dbDiscardStrategy == 1){
            dbCacheDiscard = DBCacheDiscard.DISCARD_OLDEST;
          }
          sdkConfig.setDbCacheDiscard(dbCacheDiscard);
        }

        if(sdkPkgInfo!=null){
          InnerClassProxy.addPkgInfo(sdkConfig,"reactnative",sdkPkgInfo);
        }
      if (dataModifier != null) {
        sdkConfig.setDataModifier(new DataModifier() {
                                    @Override
                                    public Object modify(String key, Object value) {
                                      return dataModifier.get(key);
                                    }
                                  }
        );
      }
      if (lineDataModifier != null) {
        sdkConfig.setLineDataModifier(new LineDataModifier() {
                                        @Override
                                        public Map<String, Object> modify(String measurement, HashMap<String, Object> data) {
                                          if (measurement.equals(FT_LOG_DEFAULT_MEASUREMENT)) {
                                            return lineDataModifier.get("log");
                                          } else {
                                            return lineDataModifier.get(measurement);
                                          }
                                        }
                                      }
        );
      }
        FTSdk.install(sdkConfig);
//        LogUtils.d("configCheck","sdkConfig:"+new Gson().toJson(sdkConfig));
        promise.resolve(null);
    }

    public void bindRUMUserData(String userId, String userName, String userEmail, ReadableMap extra, Promise promise) {
        UserData userData = new UserData();
        userData.setId(userId);
        userData.setEmail(userEmail);
        userData.setName(userName);

        HashMap<String, String> convertedMap = new HashMap<>();
        if (extra != null) {
            Map<String, Object> extraMap = extra.toHashMap();
            for (Map.Entry<String, Object> entry : extraMap.entrySet()) {
                convertedMap.put(entry.getKey(), entry.getValue() instanceof String
                        ? (String) entry.getValue()
                        : entry.getValue().toString());
            }
        }

        userData.setExts(convertedMap);
        FTSdk.bindRumUserData(userData);
      //LogUtils.d("configCheck","UserData:"+new Gson().toJson(userData));
      promise.resolve(null);
    }

    public void unbindRUMUserData(Promise promise) {
        FTSdk.unbindRumUserData();
        promise.resolve(null);
    }

    public void flushSyncData(Promise promise) {
        FTSdk.flushSyncData();
        promise.resolve(null);
    }

    public void appendGlobalContext(ReadableMap extra, Promise promise) {
        if (extra != null) {
            FTSdk.appendGlobalContext(extra.toHashMap());
        }
        promise.resolve(null);
    }

    public void appendLogGlobalContext(ReadableMap extra, Promise promise) {
        if (extra != null) {
            FTSdk.appendLogGlobalContext(extra.toHashMap());
        }
        promise.resolve(null);
    }

    public void appendRUMGlobalContext(ReadableMap extra, Promise promise) {
        if (extra != null) {
            FTSdk.appendRUMGlobalContext(extra.toHashMap());
        }
        promise.resolve(null);
    }

    public void shutDown(Promise promise) {
        FTSdk.shutDown();
        promise.resolve(null);
    }

    public void clearAllData(Promise promise) {
        FTSdk.clearAllData();
        promise.resolve(null);
    }
}
