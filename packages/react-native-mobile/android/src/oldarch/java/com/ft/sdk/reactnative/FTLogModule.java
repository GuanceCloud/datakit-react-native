package com.ft.sdk.reactnative;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

public class FTLogModule extends ReactContextBaseJavaModule {
  private final FTLogImpl logImpl = new FTLogImpl();

  public FTLogModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return FTLogImpl.NAME;
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
