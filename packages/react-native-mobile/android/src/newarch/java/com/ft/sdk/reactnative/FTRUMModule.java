package com.ft.sdk.reactnative;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;

public class FTRUMModule extends NativeFTReactNativeRUMSpec {

  private final FTRUMImpl impl = new FTRUMImpl();

  public FTRUMModule(ReactApplicationContext reactContext) {
    super(reactContext);
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
  public void onCreateView(String viewName, double duration, Promise promise) {
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

  @Override
  @ReactMethod
  public void addResource(String key, ReadableMap resource, @Nullable ReadableMap metrics, Promise promise) {
    impl.addResource(key, resource, metrics, promise);
  }
}
