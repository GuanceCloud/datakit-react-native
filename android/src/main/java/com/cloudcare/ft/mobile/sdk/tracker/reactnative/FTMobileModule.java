package com.cloudcare.ft.mobile.sdk.tracker.reactnative;

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.utils.ReactNativeUtils;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.ft.sdk.EnvType;
import com.ft.sdk.FTSDKConfig;
import com.ft.sdk.FTSdk;
import com.ft.sdk.garble.bean.UserData;

import java.util.HashMap;
import java.util.Map;

public class FTMobileModule extends ReactContextBaseJavaModule {

    public FTMobileModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "FTMobileReactNative";
    }

    @ReactMethod
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

        FTSdk.install(sdkConfig);
        promise.resolve(null);
    }

    @ReactMethod
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
        promise.resolve(null);
    }

    @ReactMethod
    public void unbindRUMUserData(Promise promise) {
        FTSdk.unbindRumUserData();
        promise.resolve(null);
    }

    @ReactMethod
    public void flushSyncData(Promise promise) {
        FTSdk.flushSyncData();
        promise.resolve(null);
    }

    @ReactMethod
    public void appendGlobalContext(ReadableMap extra, Promise promise) {
        if (extra != null) {
            FTSdk.appendGlobalContext(extra.toHashMap());
        }
        promise.resolve(null);
    }

    @ReactMethod
    public void appendLogGlobalContext(ReadableMap extra, Promise promise) {
        if (extra != null) {
            FTSdk.appendLogGlobalContext(extra.toHashMap());
        }
        promise.resolve(null);
    }

    @ReactMethod
    public void appendRUMGlobalContext(ReadableMap extra, Promise promise) {
        if (extra != null) {
            FTSdk.appendRUMGlobalContext(extra.toHashMap());
        }
        promise.resolve(null);
    }

    @ReactMethod
    public void shutDown(Promise promise) {
        FTSdk.shutDown();
        promise.resolve(null);
    }

    @ReactMethod
    public void clearAllData(Promise promise) {
        FTSdk.clearAllData();
        promise.resolve(null);
    }
}
