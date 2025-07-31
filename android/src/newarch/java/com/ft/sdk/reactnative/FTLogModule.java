package com.ft.sdk.reactnative;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

public class FTLogModule extends NativeFTReactNativeLogSpec {
  private final FTLogImpl logImpl = new FTLogImpl();

  public FTLogModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @ReactMethod
  public void logConfig(ReadableMap context, Promise promise) {
    logImpl.logConfig(context, promise);
  }

  @ReactMethod
  @Override
  public void logging(String content, double logStatus, @Nullable ReadableMap property, Promise promise) {
    logImpl.logging(content, (int) logStatus, property, promise);
  }

  @ReactMethod
  public void logWithStatusString(String content, String logStatus, ReadableMap map, Promise promise) {
    logImpl.logWithStatusString(content, logStatus, map, promise);
  }
}
