package com.ft.sdk.reactnative;

import static com.ft.sdk.garble.utils.Constants.FT_LOG_DEFAULT_MEASUREMENT;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.ft.sdk.DBCacheDiscard;
import com.ft.sdk.EnvType;
import com.ft.sdk.FTRemoteConfigManager;
import com.ft.sdk.FTSDKConfig;
import com.ft.sdk.FTSdk;
import com.ft.sdk.LineDataModifier;
import com.ft.sdk.garble.bean.RemoteConfigBean;
import com.ft.sdk.garble.bean.UserData;
import com.ft.sdk.DataModifier;
import com.ft.sdk.reactnative.utils.ReactNativeUtils;

import java.util.HashMap;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.json.JSONException;
import org.json.JSONObject;

public class FTMobileImpl {
    public static final String NAME = "FTMobileReactNative";
    private static final String REMOTE_CONFIG_EVENT = "ft_remote_config_callback";
    private final ReactApplicationContext reactContext;
    private boolean remoteConfigurationEnabled = false;
    private int remoteConfigMiniUpdateInterval = 12 * 60 * 60;
    @Nullable
    private ReadableArray remoteConfigOverrideRules;

    public FTMobileImpl(ReactApplicationContext reactContext) {
        this.reactContext = reactContext;
    }

    private static class RemoteConfigOverrideResult {
        final RemoteConfigBean configBean;
        final List<String> appliedRuleIds;

        RemoteConfigOverrideResult(RemoteConfigBean configBean, List<String> appliedRuleIds) {
            this.configBean = configBean;
            this.appliedRuleIds = appliedRuleIds;
        }
    }

    private WritableMap createRemoteConfigPayload(String triggerType,
                                                  boolean success,
                                                  @Nullable String rawJson,
                                                  @Nullable List<String> appliedRuleIds,
                                                  @Nullable String errorCode,
                                                  @Nullable String errorMessage) {
        WritableMap payload = Arguments.createMap();
        payload.putString("triggerType", triggerType);
        payload.putBoolean("success", success);
        payload.putString("platform", "android");
        payload.putDouble("timestamp", System.currentTimeMillis());
        if (rawJson != null) {
            payload.putString("rawJson", rawJson);
        }
        if (appliedRuleIds != null && !appliedRuleIds.isEmpty()) {
            WritableArray ids = Arguments.createArray();
            for (String ruleId : appliedRuleIds) {
                ids.pushString(ruleId);
            }
            payload.putArray("appliedOverrideRuleIds", ids);
        }
        if (errorCode != null) {
            payload.putString("errorCode", errorCode);
        }
        if (errorMessage != null) {
            payload.putString("errorMessage", errorMessage);
        }
        return payload;
    }

    private void emitRemoteConfigEvent(boolean success, @Nullable String rawJson,
                                       @Nullable List<String> appliedRuleIds,
                                       @Nullable String errorCode, @Nullable String errorMessage) {
        if (!reactContext.hasActiveCatalystInstance()) {
            return;
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(REMOTE_CONFIG_EVENT, createRemoteConfigPayload("auto", success, rawJson, appliedRuleIds, errorCode, errorMessage));
    }

    private RemoteConfigOverrideResult applyRemoteConfigOverrideRules(RemoteConfigBean configBean,
                                                                      @Nullable String jsonConfig) {
        if (configBean == null || jsonConfig == null || remoteConfigOverrideRules == null || remoteConfigOverrideRules.size() == 0) {
            return new RemoteConfigOverrideResult(configBean, new ArrayList<>());
        }
        List<String> appliedRuleIds = new ArrayList<>();
        try {
            JSONObject jsonObject = new JSONObject(jsonConfig);
            for (int i = 0; i < remoteConfigOverrideRules.size(); i++) {
                if (remoteConfigOverrideRules.getType(i) != ReadableType.Map) {
                    continue;
                }
                ReadableMap rule = remoteConfigOverrideRules.getMap(i);
                if (rule == null) {
                    continue;
                }
                boolean enabled = !rule.hasKey("enabled") || rule.isNull("enabled") || rule.getBoolean("enabled");
                if (!enabled) {
                    continue;
                }
                ReadableMap match = rule.hasKey("match") && !rule.isNull("match") ? rule.getMap("match") : null;
                ReadableMap customKeys = match != null && match.hasKey("customKeys") && !match.isNull("customKeys")
                    ? match.getMap("customKeys") : null;
                if (customKeys == null) {
                    continue;
                }
                HashMap<String, Object> keyMap = customKeys.toHashMap();
                if (keyMap.isEmpty()) {
                    continue;
                }
                boolean matches = true;
                for (Map.Entry<String, Object> entry : keyMap.entrySet()) {
                    String actualValue = jsonObject.optString(entry.getKey(), null);
                    String expectedValue = entry.getValue() == null ? null : entry.getValue().toString();
                    if (actualValue == null || expectedValue == null || !actualValue.equals(expectedValue)) {
                        matches = false;
                        break;
                    }
                }
                if (!matches) {
                    continue;
                }
                ReadableMap override = rule.hasKey("override") && !rule.isNull("override") ? rule.getMap("override") : null;
                if (override == null) {
                    continue;
                }
                if (override.hasKey("logSampleRate") && !override.isNull("logSampleRate")) {
                    configBean.setLogSampleRate((float) override.getDouble("logSampleRate"));
                }
                if (override.hasKey("rumSampleRate") && !override.isNull("rumSampleRate")) {
                    configBean.setRumSampleRate((float) override.getDouble("rumSampleRate"));
                }
                if (override.hasKey("traceSampleRate") && !override.isNull("traceSampleRate")) {
                    configBean.setTraceSampleRate((float) override.getDouble("traceSampleRate"));
                }
                String ruleId = rule.hasKey("id") && !rule.isNull("id") ? rule.getString("id") : null;
                appliedRuleIds.add(ruleId != null ? ruleId : "rule_" + i);
            }
        } catch (JSONException ignored) {
        }
        return new RemoteConfigOverrideResult(configBean, appliedRuleIds);
    }

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
        Map<String, Object> dataModifier = (Map<String, Object>) map.get("dataModifier");
        Map<String, Map<String,Object>> lineDataModifier = (Map<String, Map<String,Object>>) map.get("lineDataModifier");
        Boolean remoteConfiguration = (Boolean) map.get("remoteConfiguration");
        Integer remoteConfigMiniUpdateInterval = ReactNativeUtils.convertToNativeInt(map.get("remoteConfigMiniUpdateInterval"));
        this.remoteConfigOverrideRules = context.hasKey("remoteConfigOverrideRules")
            ? context.getArray("remoteConfigOverrideRules") : null;

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
      if (remoteConfiguration != null) {
        sdkConfig.setRemoteConfiguration(remoteConfiguration);
      }
      remoteConfigurationEnabled = sdkConfig.isRemoteConfiguration();
      if (remoteConfigMiniUpdateInterval != null) {
        sdkConfig.setRemoteConfigMiniUpdateInterval(remoteConfigMiniUpdateInterval);
        this.remoteConfigMiniUpdateInterval = remoteConfigMiniUpdateInterval;
      } else {
        this.remoteConfigMiniUpdateInterval = sdkConfig.getRemoteConfigMiniUpdateInterval();
      }
      if (remoteConfigurationEnabled) {
        sdkConfig.setRemoteConfigurationCallBack(new FTRemoteConfigManager.FetchResult() {
          private String rawJson;
          private List<String> appliedRuleIds = new ArrayList<>();

          @Override
          public RemoteConfigBean onConfigSuccessFetched(RemoteConfigBean configBean, String jsonConfig) {
            rawJson = jsonConfig;
            RemoteConfigOverrideResult result = applyRemoteConfigOverrideRules(configBean, jsonConfig);
            appliedRuleIds = result.appliedRuleIds;
            emitRemoteConfigEvent(true, jsonConfig, appliedRuleIds, null, null);
            return result.configBean;
          }

          @Override
          public void onResult(boolean success) {
            if (!success) {
              emitRemoteConfigEvent(false, rawJson, appliedRuleIds, "FETCH_FAILED", "Remote config update failed");
            }
            rawJson = null;
            appliedRuleIds = new ArrayList<>();
          }
        });
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

    public void updateRemoteConfig(Promise promise) {
        if (!remoteConfigurationEnabled) {
            promise.reject("E_REMOTE_CONFIG_DISABLED", "Remote configuration is not enabled.");
            return;
        }
        FTSdk.updateRemoteConfig(remoteConfigMiniUpdateInterval, new FTRemoteConfigManager.FetchResult() {
            private String rawJson;
            private List<String> appliedRuleIds = new ArrayList<>();

            @Override
            public RemoteConfigBean onConfigSuccessFetched(RemoteConfigBean configBean, String jsonConfig) {
                rawJson = jsonConfig;
                RemoteConfigOverrideResult result = applyRemoteConfigOverrideRules(configBean, jsonConfig);
                appliedRuleIds = result.appliedRuleIds;
                promise.resolve(createRemoteConfigPayload("manual", true, jsonConfig, appliedRuleIds, null, null));
                return result.configBean;
            }

            @Override
            public void onResult(boolean success) {
                if (!success) {
                    promise.reject("E_REMOTE_CONFIG_UPDATE_FAILED", "Remote config update failed");
                } else if (rawJson == null) {
                    promise.resolve(createRemoteConfigPayload("manual", true, null, appliedRuleIds, null, null));
                }
            }
        });
    }

    public void updateRemoteConfigWithMiniUpdateInterval(int interval, Promise promise) {
        if (!remoteConfigurationEnabled) {
            promise.reject("E_REMOTE_CONFIG_DISABLED", "Remote configuration is not enabled.");
            return;
        }
        FTSdk.updateRemoteConfig(interval, new FTRemoteConfigManager.FetchResult() {
            private String rawJson;
            private List<String> appliedRuleIds = new ArrayList<>();

            @Override
            public RemoteConfigBean onConfigSuccessFetched(RemoteConfigBean configBean, String jsonConfig) {
                rawJson = jsonConfig;
                RemoteConfigOverrideResult result = applyRemoteConfigOverrideRules(configBean, jsonConfig);
                appliedRuleIds = result.appliedRuleIds;
                promise.resolve(createRemoteConfigPayload("manual", true, jsonConfig, appliedRuleIds, null, null));
                return result.configBean;
            }

            @Override
            public void onResult(boolean success) {
                if (!success) {
                    promise.reject("E_REMOTE_CONFIG_UPDATE_FAILED", "Remote config update failed");
                } else if (rawJson == null) {
                    promise.resolve(createRemoteConfigPayload("manual", true, null, appliedRuleIds, null, null));
                }
            }
        });
    }

    public void addListener(String eventName) {
        // Required for NativeEventEmitter. No-op because native does not need listener bookkeeping.
    }

    public void removeListeners(double count) {
        // Required for NativeEventEmitter. No-op because native does not need listener bookkeeping.
    }
}
