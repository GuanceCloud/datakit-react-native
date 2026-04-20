package com.ft.sdk.reactnative.sessionreplay;

import androidx.annotation.NonNull;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import com.ft.sdk.reactnative.sessionreplay.views.FTPrivacyViewManager;

import java.util.ArrayList;
import java.util.List;

public class FTSessionReplayPackage implements ReactPackage {

    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new FTSessionReplayModule(reactContext));
        return modules;
    }

    @NonNull
    @Override
    public List<ViewManager> createViewManagers(@NonNull ReactApplicationContext reactApplicationContext) {
        List<ViewManager> viewManagers = new ArrayList<>();
        viewManagers.add(new FTPrivacyViewManager(reactApplicationContext));
        return viewManagers;
    }
}
