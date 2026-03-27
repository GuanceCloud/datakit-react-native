package com.ft.sdk.reactnative;

import androidx.annotation.NonNull;
import com.facebook.react.turbomodule.core.interfaces.TurboModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.module.annotations.ReactModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableMap;

@ReactModule(name = FTRUMModule.NAME)
public class FTRUMModule extends NativeFTRUMSpec {
  public static final String NAME = FTRUMImpl.NAME;
  private final FTRUMImpl impl = new FTRUMImpl();

  public FTRUMModule(ReactApplicationContext reactContext) {
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
  public void startAction(String actionName, String actionType, ReadableMap map, Promise promise) {
    impl.startAction(actionName, actionType, map, promise);
  }

  @Override
  @ReactMethod
  public void addAction(String actionName, String actionType, ReadableMap map, Promise promise) {
    impl.addAction(actionName, actionType, map, promise);
  }

  @Override
  @ReactMethod
  public void onCreateView(String viewName, Double duration, Promise promise) {
    impl.onCreateView(viewName, duration, promise);
  }

  @Override
  @ReactMethod
  public void startView(String viewName, ReadableMap map, Promise promise) {
    impl.startView(viewName, map, promise);
  }

  @Override
  @ReactMethod
  public void stopView(ReadableMap map, Promise promise) {
    impl.stopView(map, promise);
  }

  @Override
  @ReactMethod
  public void addError(String stack, String message, ReadableMap map, Promise promise) {
    impl.addError(stack, message, map, promise);
  }

  @Override
  @ReactMethod
  public void addErrorWithType(String errorType, String stack, String message, ReadableMap map, Promise promise) {
    impl.addErrorWithType(errorType, stack, message, map, promise);
  }

  @Override
  @ReactMethod
  public void startResource(String key, ReadableMap map, Promise promise) {
    impl.startResource(key, map, promise);
  }

  @Override
  @ReactMethod
  public void stopResource(String key, ReadableMap map, Promise promise) {
    impl.stopResource(key, map, promise);
  }
}
