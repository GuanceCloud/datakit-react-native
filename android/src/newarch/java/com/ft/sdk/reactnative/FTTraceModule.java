package com.ft.sdk.reactnative;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

@ReactModule(name = FTTraceModule.NAME)
public class FTTraceModule extends NativeFTTraceSpec{
  public static final String NAME = FTTraceImpl.NAME;
  private final FTTraceImpl impl = new FTTraceImpl();

  public FTTraceModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return NAME;
  }

  @Override
  @ReactMethod
  public void setConfig(ReadableMap context, Promise promise) {
    impl.setConfig(context, promise);
  }

  @Override
  @ReactMethod
  public void getTraceHeaderFields(String url, String key, Promise promise) {
    impl.getTraceHeaderFields(url, key, promise);
  }
}
