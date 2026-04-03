package com.ft.sdk.reactnative;

import com.ft.sdk.reactnative.sessionreplay.ReactNativeSessionReplayExtensionSupport;
import com.ft.sdk.reactnative.sessionreplay.utils.text.TextViewUtils;
import com.ft.sdk.reactnative.utils.ReactNativeUtils;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;
import com.ft.sdk.FTSdk;
import com.ft.sdk.SessionReplayManager;
import com.ft.sdk.sessionreplay.FTSessionReplayConfig;
import com.ft.sdk.sessionreplay.SessionReplayPrivacy;
import com.ft.sdk.sessionreplay.TouchPrivacy;
import com.ft.sdk.sessionreplay.ImagePrivacy;
import com.ft.sdk.sessionreplay.TextAndInputPrivacy;

import java.util.HashMap;

public class FTSessionReplayImpl {

  public static final String NAME = "FTReactNativeSessionReplay";


  @ReactMethod
  public void sessionReplayConfig(ReadableMap context, Promise promise, ReactContext reactContext) {
    HashMap<String, Object> map = context.toHashMap();

    Double sampleRate = map.get("sampleRate") instanceof Double ? (Double) map.get("sampleRate") : null;
    Double sessionReplayOnErrorSampleRate = map.get("sessionReplayOnErrorSampleRate") instanceof Double ? (Double) map.get("sessionReplayOnErrorSampleRate") : null;
    Integer privacy = ReactNativeUtils.convertToNativeInt(map.get("privacy"));
    Integer touchPrivacy = ReactNativeUtils.convertToNativeInt(map.get("touchPrivacy"));
    Integer textAndInputPrivacy = ReactNativeUtils.convertToNativeInt(map.get("textAndInputPrivacy"));
    Integer imagePrivacy = ReactNativeUtils.convertToNativeInt(map.get("imagePrivacy"));
    Object enableLinkRUMKeysObj = map.get("enableLinkRUMKeys");

    FTSessionReplayConfig sessionReplayConfig = new FTSessionReplayConfig();

    if (sampleRate != null) {
      sessionReplayConfig.setSampleRate(sampleRate.floatValue());
    }

    if (sessionReplayOnErrorSampleRate != null) {
      sessionReplayConfig.setSessionReplayOnErrorSampleRate(sessionReplayOnErrorSampleRate.floatValue());
    }

    // Handle deprecated privacy setting for backward compatibility
    if (privacy != null) {
      SessionReplayPrivacy sessionReplayPrivacy = switch (privacy) {
        case 0 -> SessionReplayPrivacy.MASK;
        case 1 -> SessionReplayPrivacy.ALLOW;
        case 2 -> SessionReplayPrivacy.MASK_USER_INPUT;
        default -> null;
      };
      sessionReplayConfig.setPrivacy(sessionReplayPrivacy);
    }

    // Handle fine-grained privacy settings (overrides deprecated privacy setting if provided)
    if (touchPrivacy != null) {
      switch (touchPrivacy) {
        case 0:
          sessionReplayConfig.setTouchPrivacy(TouchPrivacy.SHOW);
          break;
        case 1:
          sessionReplayConfig.setTouchPrivacy(TouchPrivacy.HIDE);
          break;
      }
    }

    if (textAndInputPrivacy != null) {
      switch (textAndInputPrivacy) {
        case 0:
          sessionReplayConfig.setTextAndInputPrivacy(TextAndInputPrivacy.MASK_SENSITIVE_INPUTS);
          break;
        case 1:
          sessionReplayConfig.setTextAndInputPrivacy(TextAndInputPrivacy.MASK_ALL_INPUTS);
          break;
        case 2:
          sessionReplayConfig.setTextAndInputPrivacy(TextAndInputPrivacy.MASK_ALL);
          break;
      }
    }

    if (imagePrivacy != null) {
      switch (imagePrivacy) {
        case 0:
          // MASK_NON_BUNDLED_ONLY (iOS) maps to MASK_LARGE_ONLY (Android)
          sessionReplayConfig.setImagePrivacy(ImagePrivacy.MASK_LARGE_ONLY);
          break;
        case 1:
          // MASK_ALL
          sessionReplayConfig.setImagePrivacy(ImagePrivacy.MASK_ALL);
          break;
        case 2:
          // MASK_NONE
          sessionReplayConfig.setImagePrivacy(ImagePrivacy.MASK_NONE);
          break;
      }
    }

    // Handle enableLinkRUMKeys
    if (enableLinkRUMKeysObj instanceof ReadableArray rumKeysArray) {
      String[] rumKeys = new String[rumKeysArray.size()];
      for (int i = 0; i < rumKeysArray.size(); i++) {
        rumKeys[i] = rumKeysArray.getString(i);
      }
      sessionReplayConfig.enableLinkRUMKeys(rumKeys);
    }

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
