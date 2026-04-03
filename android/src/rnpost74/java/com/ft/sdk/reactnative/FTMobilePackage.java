/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
package com.ft.sdk.reactnative;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.BaseReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import com.facebook.react.uimanager.ViewManager;
import com.ft.sdk.reactnative.sessionreplay.views.FTPrivacyViewManager;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class FTMobilePackage extends BaseReactPackage {


  @Nullable
  @Override
  public NativeModule getModule(@NonNull String name, @NonNull ReactApplicationContext reactApplicationContext) {
    switch (name) {
      case FTMobileImpl.NAME:
        return new FTMobileModule(reactApplicationContext);
      case FTLogImpl.NAME:
        return new FTLogModule(reactApplicationContext);
      case FTTraceImpl.NAME:
        return new FTTraceModule(reactApplicationContext);
      case FTRUMImpl.NAME:
        return new FTRUMModule(reactApplicationContext);
      case FTSessionReplayImpl.NAME:
        return new FTSessionReplayModule(reactApplicationContext);
      default:
        return null;
    }
  }

  @Override
  public ReactModuleInfoProvider getReactModuleInfoProvider() {
    return new ReactModuleInfoProvider() {
      @Override
      public Map<String, ReactModuleInfo> getReactModuleInfos() {
        boolean isTurboModule = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;

        String[] moduleNames = {
          FTMobileImpl.NAME,
          FTRUMImpl.NAME,
          FTLogImpl.NAME,
          FTTraceImpl.NAME,
          FTSessionReplayImpl.NAME,
        };
        Map<String, ReactModuleInfo> moduleInfos = new HashMap<>();

        for (String moduleName : moduleNames) {
          moduleInfos.put(
            moduleName,
            new ReactModuleInfo(
              moduleName,
              moduleName,
              false, // canOverrideExistingModule
              false, // needsEagerInit
              false, // isCxxModule
              isTurboModule // isTurboModule
            )
          );
        }
        return moduleInfos;
      }
    };
  }

  @NonNull
  @Override
  public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactApplicationContext) {
    List<ViewManager> viewManagers = new ArrayList<>();
    viewManagers.add(new FTPrivacyViewManager(reactApplicationContext));
    return viewManagers;
  }
}
