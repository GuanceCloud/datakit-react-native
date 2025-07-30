package com.ft.sdk.reactnative;

import androidx.annotation.NonNull;
import com.facebook.react.turbomodule.core.interfaces.TurboModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;

@ReactModule(name = FTSessionReplayModule.NAME)
public class FTSessionReplayModule extends NativeFTSessionReplaySpec  {
  public static final String NAME = FTSessionReplayImpl.NAME;
  private final FTSessionReplayImpl impl = new FTSessionReplayImpl();

  public FTSessionReplayModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return NAME;
  }

  @Override
  @ReactMethod
  public void sessionReplayConfig(ReadableMap context, Promise promise) {
    impl.sessionReplayConfig(context, promise, getReactApplicationContext());
  }
}
