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
import org.json.JSONArray;
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
        return applyRemoteConfigOverrideRules(configBean, jsonConfig, this.remoteConfigOverrideRules);
    }

    private RemoteConfigOverrideResult applyRemoteConfigOverrideRules(RemoteConfigBean configBean,
                                                                      @Nullable String jsonConfig,
                                                                      @Nullable ReadableArray rules) {
        if (configBean == null || jsonConfig == null || rules == null || rules.size() == 0) {
            return new RemoteConfigOverrideResult(configBean, new ArrayList<>());
        }
        List<String> appliedRuleIds = new ArrayList<>();
        try {
            JSONObject jsonObject = new JSONObject(jsonConfig);
            for (int i = 0; i < rules.size(); i++) {
                if (rules.getType(i) != ReadableType.Map) {
                    continue;
                }
                ReadableMap rule = rules.getMap(i);
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
                    Object expectedValue = entry.getValue();
                    Object actualValue = getJsonValue(jsonObject, entry.getKey());

                    if (!matchesCustomKey(actualValue, expectedValue)) {
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

                // Basic configuration properties
                if (override.hasKey("env") && !override.isNull("env")) {
                    configBean.setEnv(override.getString("env"));
                }
                if (override.hasKey("serviceName") && !override.isNull("serviceName")) {
                    configBean.setServiceName(override.getString("serviceName"));
                }
                if (override.hasKey("autoSync") && !override.isNull("autoSync")) {
                    configBean.setAutoSync(override.getBoolean("autoSync"));
                }
                if (override.hasKey("compressIntakeRequests") && !override.isNull("compressIntakeRequests")) {
                    configBean.setCompressIntakeRequests(override.getBoolean("compressIntakeRequests"));
                }
                if (override.hasKey("syncPageSize") && !override.isNull("syncPageSize")) {
                    configBean.setSyncPageSize(override.getInt("syncPageSize"));
                }
                if (override.hasKey("syncSleepTime") && !override.isNull("syncSleepTime")) {
                    configBean.setSyncSleepTime(override.getInt("syncSleepTime"));
                }

                // Log configuration properties
                if (override.hasKey("logSampleRate") && !override.isNull("logSampleRate")) {
                    configBean.setLogSampleRate((float) override.getDouble("logSampleRate"));
                }
                if (override.hasKey("logLevelFilters") && !override.isNull("logLevelFilters")) {
                    ReadableArray filtersArray = override.getArray("logLevelFilters");
                    String[] filters = new String[filtersArray.size()];
                    for (int j = 0; j < filtersArray.size(); j++) {
                        filters[j] = filtersArray.getString(j);
                    }
                    configBean.setLogLevelFilters(filters);
                }
                if (override.hasKey("logEnableCustomLog") && !override.isNull("logEnableCustomLog")) {
                    configBean.setLogEnableCustomLog(override.getBoolean("logEnableCustomLog"));
                }
                if (override.hasKey("logEnableConsoleLog") && !override.isNull("logEnableConsoleLog")) {
                    configBean.setLogEnableConsoleLog(override.getBoolean("logEnableConsoleLog"));
                }

                // RUM configuration properties
                if (override.hasKey("rumSampleRate") && !override.isNull("rumSampleRate")) {
                    configBean.setRumSampleRate((float) override.getDouble("rumSampleRate"));
                }
                if (override.hasKey("rumSessionOnErrorSampleRate") && !override.isNull("rumSessionOnErrorSampleRate")) {
                    configBean.setRumSessionOnErrorSampleRate((float) override.getDouble("rumSessionOnErrorSampleRate"));
                }
                if (override.hasKey("rumEnableTraceUserAction") && !override.isNull("rumEnableTraceUserAction")) {
                    configBean.setRumEnableTraceUserAction(override.getBoolean("rumEnableTraceUserAction"));
                }
                if (override.hasKey("rumEnableTraceUserView") && !override.isNull("rumEnableTraceUserView")) {
                    configBean.setRumEnableTraceUserView(override.getBoolean("rumEnableTraceUserView"));
                }
                if (override.hasKey("rumEnableTraceUserResource") && !override.isNull("rumEnableTraceUserResource")) {
                    configBean.setRumEnableTraceUserResource(override.getBoolean("rumEnableTraceUserResource"));
                }
                if (override.hasKey("rumEnableResourceHostIP") && !override.isNull("rumEnableResourceHostIP")) {
                    configBean.setRumEnableResourceHostIP(override.getBoolean("rumEnableResourceHostIP"));
                }
                if (override.hasKey("rumEnableTrackAppUIBlock") && !override.isNull("rumEnableTrackAppUIBlock")) {
                    configBean.setRumEnableTrackAppUIBlock(override.getBoolean("rumEnableTrackAppUIBlock"));
                }
                if (override.hasKey("rumBlockDurationMs") && !override.isNull("rumBlockDurationMs")) {
                    configBean.setRumBlockDurationMs((long) override.getInt("rumBlockDurationMs"));
                }
                if (override.hasKey("rumEnableTrackAppCrash") && !override.isNull("rumEnableTrackAppCrash")) {
                    configBean.setRumEnableTrackAppCrash(override.getBoolean("rumEnableTrackAppCrash"));
                }
                if (override.hasKey("rumEnableTrackAppANR") && !override.isNull("rumEnableTrackAppANR")) {
                    configBean.setRumEnableTrackAppANR(override.getBoolean("rumEnableTrackAppANR"));
                }
                if (override.hasKey("rumEnableTraceWebView") && !override.isNull("rumEnableTraceWebView")) {
                    configBean.setRumEnableTraceWebView(override.getBoolean("rumEnableTraceWebView"));
                }
                if (override.hasKey("rumAllowWebViewHost") && !override.isNull("rumAllowWebViewHost")) {
                    ReadableArray hostsArray = override.getArray("rumAllowWebViewHost");
                    String[] hosts = new String[hostsArray.size()];
                    for (int j = 0; j < hostsArray.size(); j++) {
                        hosts[j] = hostsArray.getString(j);
                    }
                    configBean.setRumAllowWebViewHost(hosts);
                }

                // Trace configuration properties
                if (override.hasKey("traceSampleRate") && !override.isNull("traceSampleRate")) {
                    configBean.setTraceSampleRate((float) override.getDouble("traceSampleRate"));
                }
                if (override.hasKey("traceEnableAutoTrace") && !override.isNull("traceEnableAutoTrace")) {
                    configBean.setTraceEnableAutoTrace(override.getBoolean("traceEnableAutoTrace"));
                }
                if (override.hasKey("traceType") && !override.isNull("traceType")) {
                    configBean.setTraceType(override.getString("traceType"));
                }

                String ruleId = rule.hasKey("id") && !rule.isNull("id") ? rule.getString("id") : null;
                appliedRuleIds.add(ruleId != null ? ruleId : "rule_" + i);
            }
        } catch (JSONException ignored) {
        }
        return new RemoteConfigOverrideResult(configBean, appliedRuleIds);
    }

    private Object getJsonValue(JSONObject jsonObject, String key) {
        if (!jsonObject.has(key)) {
            return null;
        }
        try {
            Object value = jsonObject.get(key);
            if (value == JSONObject.NULL) {
                return null;
            }
            return value;
        } catch (JSONException e) {
            return null;
        }
    }

    private boolean isEqualValue(Object actual, Object expected) {
        if (actual == null && expected == null) {
            return true;
        }
        if (actual == null || expected == null) {
            return false;
        }

        if (actual instanceof String) {
            String actualString = (String) actual;
            Object normalizedActual = parseJsonStringIfNeeded(actualString);
            if (normalizedActual != actual) {
                return isEqualValue(normalizedActual, expected);
            }
        }

        // Handle number comparison
        if (actual instanceof Number && expected instanceof Number) {
            return ((Number) actual).doubleValue() == ((Number) expected).doubleValue();
        }

        // Handle string comparison
        if (actual instanceof String && expected instanceof String) {
            return actual.equals(expected);
        }

        // Handle boolean comparison (JSON booleans are represented as Boolean in Java)
        if (actual instanceof Boolean && expected instanceof Boolean) {
            return actual.equals(expected);
        }

        // Fallback to string comparison
        return actual.toString().equals(expected.toString());
    }

    private boolean matchesCustomKey(Object actual, Object expected) {
        if (expected instanceof Map) {
            Map<?, ?> expectedMap = (Map<?, ?>) expected;
            if (expectedMap.containsKey("contains")) {
                return containsValue(actual, expectedMap.get("contains"));
            }
        }
        return isEqualValue(actual, expected);
    }

    private boolean containsValue(Object actual, Object expectedValue) {
        Object normalizedActual = actual;
        if (actual instanceof String) {
            normalizedActual = parseJsonStringIfNeeded((String) actual);
        }

        if (normalizedActual instanceof JSONArray) {
            JSONArray actualArray = (JSONArray) normalizedActual;
            try {
                for (int i = 0; i < actualArray.length(); i++) {
                    if (isEqualValue(actualArray.get(i), expectedValue)) {
                        return true;
                    }
                }
            } catch (JSONException ignored) {
                return false;
            }
        }
        return isEqualValue(normalizedActual, expectedValue);
    }

    private Object parseJsonStringIfNeeded(String value) {
        String trimmedValue = value.trim();
        if (trimmedValue.length() < 2) {
            return value;
        }
        try {
            if (trimmedValue.startsWith("[") && trimmedValue.endsWith("]")) {
                return new JSONArray(trimmedValue);
            }
        } catch (JSONException ignored) {
            return value;
        }
        return value;
    }

    @Nullable
    private HashMap<String, String[]> convertDataFilters(@Nullable Map<String, Object> filters) {
        if (filters == null) {
            return null;
        }
        HashMap<String, String[]> convertedFilters = new HashMap<>();
        for (Map.Entry<String, Object> entry : filters.entrySet()) {
            Object value = entry.getValue();
            if (!(value instanceof List<?>)) {
                continue;
            }
            List<?> filterList = (List<?>) value;
            List<String> filterValues = new ArrayList<>();
            for (Object filter : filterList) {
                if (filter != null) {
                    filterValues.add(filter.toString());
                }
            }
            convertedFilters.put(entry.getKey(), filterValues.toArray(new String[0]));
        }
        return convertedFilters;
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
        Boolean enableDataFilter = (Boolean) map.get("enableDataFilter");
        Map<String, Object> dataFilters = (Map<String, Object>) map.get("dataFilters");
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
        if (enableDataFilter != null) {
            sdkConfig.setEnableDataFilter(enableDataFilter);
        }
        HashMap<String, String[]> convertedDataFilters = convertDataFilters(dataFilters);
        if (convertedDataFilters != null) {
            sdkConfig.setDataFilters(convertedDataFilters);
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
            emitRemoteConfigEvent(true, configBean.toJsonString(), appliedRuleIds, null, null);
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

    public void setDatakitURL(String datakitUrl, Promise promise) {
        FTSdk.setDatakitUrl(datakitUrl);
        promise.resolve(null);
    }

    public void setDatawayURL(String datawayUrl, String clientToken, Promise promise) {
        FTSdk.setDatawayUrl(datawayUrl, clientToken);
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
                promise.resolve(createRemoteConfigPayload("manual", true, configBean.toJsonString(), appliedRuleIds, null, null));
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

    public void updateRemoteConfigWithMiniUpdateInterval(int interval, @Nullable ReadableArray rules, Promise promise) {
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
                ReadableArray rulesToApply = rules != null && rules.size() > 0 ? rules : remoteConfigOverrideRules;
                RemoteConfigOverrideResult result = applyRemoteConfigOverrideRules(configBean, jsonConfig, rulesToApply);
                appliedRuleIds = result.appliedRuleIds;
                promise.resolve(createRemoteConfigPayload("manual", true, configBean.toJsonString(), appliedRuleIds, null, null));
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
