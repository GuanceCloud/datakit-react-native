package com.ft.sdk.reactnative;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

public class FTTraceModule extends NativeFTReactNativeTraceSpec {
  private final FTTraceImpl impl = new FTTraceImpl();

  public FTTraceModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  @ReactMethod
  public void setConfig(ReadableMap context, Promise promise) {
    impl.setConfig(context, promise);
  }

  @Override
  @ReactMethod
  public void getTraceHeader(String key, String url, Promise promise) {
    //no need to implement
  }

  @Override
  @ReactMethod
  public void getTraceHeaderFields(String url, String key, Promise promise) {
    impl.getTraceHeaderFields(url, key, promise);
  }
}
