package com.ft.sdk.reactnative.sessionreplay;

import com.ft.sdk.reactnative.sessionreplay.utils.text.TextViewUtils;
import com.ft.sdk.reactnative.sessionreplay.utils.ReactNativeUtils;
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
    String touchPrivacy = map.get("touchPrivacy") instanceof String ? (String) map.get("touchPrivacy") : null;
    String textAndInputPrivacy = map.get("textAndInputPrivacy") instanceof String ? (String) map.get("textAndInputPrivacy") : null;
    String imagePrivacy = map.get("imagePrivacy") instanceof String ? (String) map.get("imagePrivacy") : null;
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
        case "SHOW":
          sessionReplayConfig.setTouchPrivacy(TouchPrivacy.SHOW);
          break;
        case "HIDE":
          sessionReplayConfig.setTouchPrivacy(TouchPrivacy.HIDE);
          break;
      }
    }

    if (textAndInputPrivacy != null) {
      switch (textAndInputPrivacy) {
        case "MASK_SENSITIVE_INPUTS":
          sessionReplayConfig.setTextAndInputPrivacy(TextAndInputPrivacy.MASK_SENSITIVE_INPUTS);
          break;
        case "MASK_ALL_INPUTS":
          sessionReplayConfig.setTextAndInputPrivacy(TextAndInputPrivacy.MASK_ALL_INPUTS);
          break;
        case "MASK_ALL":
          sessionReplayConfig.setTextAndInputPrivacy(TextAndInputPrivacy.MASK_ALL);
          break;
      }
    }

    if (imagePrivacy != null) {
      switch (imagePrivacy) {
        case "MASK_NON_BUNDLED_ONLY":
          // MASK_NON_BUNDLED_ONLY (iOS) maps to MASK_LARGE_ONLY (Android)
          sessionReplayConfig.setImagePrivacy(ImagePrivacy.MASK_LARGE_ONLY);
          break;
        case "MASK_ALL":
          // MASK_ALL
          sessionReplayConfig.setImagePrivacy(ImagePrivacy.MASK_ALL);
          break;
        case "MASK_NONE":
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
