package com.ft.sdk.reactnative;

import com.ft.sdk.reactnative.sessionreplay.ReactNativeSessionReplayExtensionSupport;
import com.ft.sdk.reactnative.sessionreplay.utils.text.TextViewUtils;
import com.ft.sdk.reactnative.utils.ReactNativeUtils;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.ft.sdk.FTSdk;
import com.ft.sdk.SessionReplayManager;
import com.ft.sdk.sessionreplay.FTSessionReplayConfig;
import com.ft.sdk.sessionreplay.SessionReplayPrivacy;

public class FTSessionReplayImpl {

  public static final String NAME = "FTReactNativeSessionReplay";


  @ReactMethod
  public void sessionReplayConfig(ReadableMap context, Promise promise, ReactContext reactContext) {
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
    TextViewUtils textViewUtils = TextViewUtils.create(reactContext,
      SessionReplayManager.get().getInternalLogger());
    sessionReplayConfig.addExtensionSupport(
      new ReactNativeSessionReplayExtensionSupport(textViewUtils
      )
    ).setDelayInit(true);
    FTSdk.initSessionReplayConfig(sessionReplayConfig);
    promise.resolve(null);
  }
}
