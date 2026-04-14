package com.ft.sdk.reactnative.sessionreplay;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.BaseReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.model.ReactModuleInfo;
import com.facebook.react.module.model.ReactModuleInfoProvider;
import com.facebook.react.uimanager.ViewManager;
import com.ft.sdk.reactnative.sessionreplay.views.FTPrivacyViewManager;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class FTSessionReplayPackage extends BaseReactPackage {

  @Nullable
  @Override
  public NativeModule getModule(@NonNull String name, @NonNull ReactApplicationContext reactApplicationContext) {
    if (FTSessionReplayImpl.NAME.equals(name)) {
      return new FTSessionReplayModule(reactApplicationContext);
    }
    return null;
  }

  @Override
  public ReactModuleInfoProvider getReactModuleInfoProvider() {
    return new ReactModuleInfoProvider() {
      @Override
      public Map<String, ReactModuleInfo> getReactModuleInfos() {
        boolean isTurboModule = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED;
        Map<String, ReactModuleInfo> moduleInfos = new HashMap<>();
        moduleInfos.put(
          FTSessionReplayImpl.NAME,
          new ReactModuleInfo(
            FTSessionReplayImpl.NAME,
            FTSessionReplayImpl.NAME,
            false,
            false,
            false,
            isTurboModule
          )
        );
        return moduleInfos;
      }
    };
  }

  @NonNull
  @Override
  public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactApplicationContext) {
    return Collections.singletonList(new FTPrivacyViewManager(reactApplicationContext));
  }
}
