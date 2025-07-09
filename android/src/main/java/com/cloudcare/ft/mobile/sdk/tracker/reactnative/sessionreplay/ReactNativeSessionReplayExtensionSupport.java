/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

package com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay;

import androidx.annotation.VisibleForTesting;

import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.mappers.ReactEditTextMapper;
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.mappers.ReactTextMapper;
import com.cloudcare.ft.mobile.sdk.tracker.reactnative.sessionreplay.mappers.ReactViewGroupMapper;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.uimanager.UIManagerModule;
import com.facebook.react.views.text.ReactTextView;
import com.facebook.react.views.textinput.ReactEditText;
import com.facebook.react.views.view.ReactViewGroup;
import com.ft.sdk.garble.utils.LogUtils;
import com.ft.sdk.sessionreplay.ExtensionSupport;
import com.ft.sdk.sessionreplay.MapperTypeWrapper;
import com.ft.sdk.sessionreplay.recorder.OptionSelectorDetector;
import com.ft.sdk.sessionreplay.utils.DrawableToColorMapper;
import com.ft.sdk.sessionreplay.utils.InternalLogger;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class ReactNativeSessionReplayExtensionSupport implements ExtensionSupport {
  private final ReactContext reactContext;
  private final InternalLogger logger;

  public static final String RESOLVE_UIMANAGERMODULE_ERROR = "Unable to resolve UIManagerModule";
  private static final String TAG = "ReactNativeSessionReplay";

  public ReactNativeSessionReplayExtensionSupport(ReactContext reactContext, InternalLogger logger) {
    this.reactContext = reactContext;
    this.logger = logger;
  }

  @Override
  public List<MapperTypeWrapper<?>> getCustomViewMappers() {
    UIManagerModule uiManagerModule = getUiManagerModule();
    ReactTextMapper reactTextMapper = new ReactTextMapper(reactContext, uiManagerModule);
    return Arrays.asList(
      new MapperTypeWrapper<>(ReactViewGroup.class, new ReactViewGroupMapper()),
      new MapperTypeWrapper<>(ReactTextView.class, reactTextMapper),
      new MapperTypeWrapper<>(
        ReactEditText.class,
        new ReactEditTextMapper(reactContext, uiManagerModule)
      )
    );
  }

  @Override
  public List<OptionSelectorDetector> getOptionSelectorDetectors() {
    return new ArrayList<>();
  }

  @Override
  public List<DrawableToColorMapper> getCustomDrawableMapper() {
    return new ArrayList<>();
  }

  @VisibleForTesting
  UIManagerModule getUiManagerModule() {
    try {
      return reactContext.getNativeModule(UIManagerModule.class);
    } catch (IllegalStateException e) {
      logger.w(
        TAG,
        RESOLVE_UIMANAGERMODULE_ERROR + "\n" + LogUtils.getStackTraceString(e)
      );
      return null;
    }
  }
}
