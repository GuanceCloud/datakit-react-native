package com.ft.sdk.reactnative.sessionreplay;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

public class FTSessionReplayModule extends NativeFTReactNativeSessionReplaySpec {
  private final FTSessionReplayImpl impl = new FTSessionReplayImpl();

  public FTSessionReplayModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  @ReactMethod
  public void sessionReplayConfig(ReadableMap context, Promise promise) {
    impl.sessionReplayConfig(context, promise, getReactApplicationContext());
  }
}
