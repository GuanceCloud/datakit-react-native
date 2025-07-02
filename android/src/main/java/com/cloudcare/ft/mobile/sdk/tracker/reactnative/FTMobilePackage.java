package com.cloudcare.ft.mobile.sdk.tracker.reactnative;

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class FTMobilePackage implements ReactPackage {

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new FTMobileModule(reactContext));
        modules.add(new FTLogModule(reactContext));
        modules.add(new FTTraceModule(reactContext));
        modules.add(new FTRUMModule(reactContext));
        return modules;
    }

  @NonNull
  @Override
  public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactApplicationContext) {
    return Collections.emptyList();
  }


}
