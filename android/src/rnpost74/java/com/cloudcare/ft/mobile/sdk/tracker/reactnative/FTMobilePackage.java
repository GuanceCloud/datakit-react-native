package com.cloudcare.ft.mobile.sdk.tracker.reactnative;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.BaseReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;

import java.util.HashMap;
import java.util.Map;

public class FTMobilePackage extends BaseReactPackage {


  @Nullable
  @Override
  public NativeModule getModule(@NonNull String name, @NonNull ReactApplicationContext reactApplicationContext) {
    switch (name) {
      case FTMobileModule.NAME:
        return new FTMobileModule(reactApplicationContext);
      case FTLogModule.NAME:
        return new FTLogModule(reactApplicationContext);
      case FTTraceModule.NAME:
        return new FTTraceModule(reactApplicationContext);
      case FTRUMModule.NAME:
        return new FTRUMModule(reactApplicationContext);
      case FTSessionReplayModule.NAME:
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
          FTMobileModule.NAME,
          FTLogModule.NAME,
          FTRUMModule.NAME,
          FTSessionReplayModule.NAME,
          FTTraceModule.NAME
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
}
