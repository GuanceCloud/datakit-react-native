package com.ft.sdk.reactnative;

import androidx.annotation.NonNull;

import com.facebook.react.turbomodule.core.interfaces.TurboModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;

@ReactModule(name = FTLogModule.NAME)
public class FTLogModule extends NativeFTLogSpec  {
  private final FTLogInterface logImpl = new FTLogImpl();

  public FTLogModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return NAME;
  }

  @ReactMethod
  public void logConfig(ReadableMap context, Promise promise) {
    logImpl.logConfig(context, promise);
  }

  @ReactMethod
  public void logging(String content, int logStatus, ReadableMap map, Promise promise) {
    logImpl.logging(content, logStatus, map, promise);
  }

  @ReactMethod
  public void logWithStatusString(String content, String logStatus, ReadableMap map, Promise promise) {
    logImpl.logWithStatusString(content, logStatus, map, promise);
  }
}
