package com.ft.sdk.reactnative;

import com.facebook.react.bridge.ReactApplicationContext;

final class ReactJsThreadExecutor implements JsLongTaskMonitor.Executor {
  private final ReactApplicationContext reactContext;

  ReactJsThreadExecutor(ReactApplicationContext reactContext) {
    this.reactContext = reactContext;
  }

  @Override
  public boolean runOnJsThread(Runnable runnable) {
    try {
      return reactContext.runOnJSQueueThread(runnable);
    } catch (AssertionError ignored) {
      // ReactContext asserts if its JS queue has not been initialized yet.
      return false;
    }
  }
}
