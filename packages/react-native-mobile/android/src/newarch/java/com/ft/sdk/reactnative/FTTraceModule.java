package com.ft.sdk.reactnative;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableMap;

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

  @Override
  @ReactMethod(isBlockingSynchronousMethod = true)
  public WritableMap getTraceHeaderFieldsSync(String url, String key) {
    return impl.getTraceHeaderFieldsSync(url, key);
  }

  @Override
  @ReactMethod
  public void cancelWebSocketTrace(String key, Promise promise) {
    // JS WebSocket observation is iOS-only; Android owns its native lifecycle.
    promise.resolve(null);
  }
}
