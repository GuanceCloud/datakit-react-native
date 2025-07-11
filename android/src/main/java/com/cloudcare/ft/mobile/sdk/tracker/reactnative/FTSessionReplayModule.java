package com.cloudcare.ft.mobile.sdk.tracker.reactnative;

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.ReactNativeSessionReplayExtensionSupport;
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.utils.text.TextViewUtils;
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.utils.ReactNativeUtils;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.ft.sdk.FTSdk;
import com.ft.sdk.SessionReplayManager;
import com.ft.sdk.sessionreplay.FTSessionReplayConfig;
import com.ft.sdk.sessionreplay.SessionReplayPrivacy;

public class FTSessionReplayModule extends ReactContextBaseJavaModule {
    public FTSessionReplayModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return "FTReactNativeSessionReplay";
    }

    @ReactMethod
    public void sessionReplayConfig(ReadableMap context, Promise promise) {
        java.util.HashMap<String, Object> map = context.toHashMap();

        Double sampleRate = map.get("sampleRate") instanceof Double ? (Double) map.get("sampleRate") : null;
        Integer privacy = ReactNativeUtils.convertToNativeInt(map.get("privacy"));
        FTSessionReplayConfig sessionReplayConfig = new FTSessionReplayConfig();

        if (sampleRate != null) {
            sessionReplayConfig.setSampleRate(sampleRate.floatValue());
        }

        SessionReplayPrivacy sessionReplayPrivacy;
        if (privacy != null) {
            switch (privacy) {
                case 0:
                    sessionReplayPrivacy = SessionReplayPrivacy.MASK;
                    break;
                case 1:
                    sessionReplayPrivacy = SessionReplayPrivacy.ALLOW;
                    break;
                case 2:
                    sessionReplayPrivacy = SessionReplayPrivacy.MASK_USER_INPUT;
                    break;
                default:
                    sessionReplayPrivacy = SessionReplayPrivacy.MASK;
            }
        } else {
            sessionReplayPrivacy = SessionReplayPrivacy.MASK;
        }
      sessionReplayConfig.setPrivacy(sessionReplayPrivacy);
      TextViewUtils textViewUtils = TextViewUtils.create(getReactApplicationContext(),
        SessionReplayManager.get().getInternalLogger());
      sessionReplayConfig.addExtensionSupport(
        new ReactNativeSessionReplayExtensionSupport(textViewUtils
        )
      ).setDelayInit(true);
      FTSdk.initSessionReplayConfig(sessionReplayConfig);
      promise.resolve(null);
    }
}
