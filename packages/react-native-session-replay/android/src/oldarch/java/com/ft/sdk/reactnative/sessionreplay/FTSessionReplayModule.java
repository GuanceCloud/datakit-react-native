package com.ft.sdk.reactnative.sessionreplay;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

public class FTSessionReplayModule extends ReactContextBaseJavaModule {
  private final FTSessionReplayImpl impl = new FTSessionReplayImpl();

  public FTSessionReplayModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return FTSessionReplayImpl.NAME;
  }

  @ReactMethod
  public void sessionReplayConfig(ReadableMap context, Promise promise) {
    impl.sessionReplayConfig(context, promise, getReactApplicationContext());
  }
}
