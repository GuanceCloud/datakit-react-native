package com.ft.sdk.reactnative;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.ReadableMap;

public class FTMobileModule extends ReactContextBaseJavaModule {
  private final FTMobileImpl impl;

  public FTMobileModule(ReactApplicationContext reactContext) {
    super(reactContext);
    impl = new FTMobileImpl(reactContext);
  }

  @ReactMethod
  public void sdkConfig(ReadableMap context, Promise promise) {
    impl.sdkConfig(context, promise);
  }

  @ReactMethod
  public void setDatakitURL(String datakitUrl, Promise promise) {
    impl.setDatakitURL(datakitUrl, promise);
  }

  @ReactMethod
  public void setDatawayURL(String datawayUrl, String clientToken, Promise promise) {
    impl.setDatawayURL(datawayUrl, clientToken, promise);
  }

  @ReactMethod
  public void bindRUMUserData(String userId, String userName, String userEmail, ReadableMap extra, Promise promise) {
    impl.bindRUMUserData(userId, userName, userEmail, extra, promise);
  }

  @ReactMethod
  public void unbindRUMUserData(Promise promise) {
    impl.unbindRUMUserData(promise);
  }

  @ReactMethod
  public void flushSyncData(Promise promise) {
    impl.flushSyncData(promise);
  }

  @ReactMethod
  public void appendGlobalContext(ReadableMap extra, Promise promise) {
    impl.appendGlobalContext(extra, promise);
  }

  @ReactMethod
  public void appendLogGlobalContext(ReadableMap extra, Promise promise) {
    impl.appendLogGlobalContext(extra, promise);
  }

  @ReactMethod
  public void appendRUMGlobalContext(ReadableMap extra, Promise promise) {
    impl.appendRUMGlobalContext(extra, promise);
  }

  @ReactMethod
  public void shutDown(Promise promise) {
    impl.shutDown(promise);
  }

  @ReactMethod
  public void clearAllData(Promise promise) {
    impl.clearAllData(promise);
  }

  @ReactMethod
  public void updateRemoteConfig(Promise promise) {
    impl.updateRemoteConfig(promise);
  }

  @ReactMethod
  public void updateRemoteConfigWithMiniUpdateInterval(int interval, @Nullable ReadableArray rules, Promise promise) {
    impl.updateRemoteConfigWithMiniUpdateInterval(interval, rules, promise);
  }

  @ReactMethod
  public void addListener(String eventName) {
    impl.addListener(eventName);
  }

  @ReactMethod
  public void removeListeners(double count) {
    impl.removeListeners(count);
  }

  @NonNull
  @Override
  public String getName() {
    return FTMobileImpl.NAME;
  }
}
