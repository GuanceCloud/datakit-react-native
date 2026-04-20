package com.ft.sdk.reactnative;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

public class FTTraceModule extends ReactContextBaseJavaModule {
  private final FTTraceImpl impl = new FTTraceImpl();

  public FTTraceModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return FTTraceImpl.NAME;
  }

  @ReactMethod
  public void setConfig(ReadableMap context, Promise promise) {
    impl.setConfig(context, promise);
  }

  @ReactMethod
  public void getTraceHeaderFields(String url, String key, Promise promise) {
    impl.getTraceHeaderFields(url, key, promise);
  }
}
