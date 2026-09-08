package com.ft.sdk.reactnative;

import android.os.Handler;
import android.os.Looper;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.queue.MessageQueueThread;
import com.facebook.react.bridge.queue.MessageQueueThreadImpl;
import com.facebook.react.bridge.queue.ReactQueueConfiguration;

final class ReactJsThreadExecutor implements JsLongTaskMonitor.Executor {
  private final ReactApplicationContext reactContext;

  ReactJsThreadExecutor(ReactApplicationContext reactContext) {
    this.reactContext = reactContext;
  }

  @Override
  public boolean runOnJsThread(Runnable runnable) {
    if (!reactContext.hasActiveCatalystInstance()) {
      return false;
    }
    ReactQueueConfiguration configuration =
      reactContext.getCatalystInstance().getReactQueueConfiguration();
    if (configuration == null) {
      return false;
    }
    MessageQueueThread queue = configuration.getJSQueueThread();
    if (!(queue instanceof MessageQueueThreadImpl)) {
      return false;
    }
    Looper looper = ((MessageQueueThreadImpl) queue).getLooper();
    // Older RN queue APIs return void. Post SDK work to the same JS looper so
    // a stopped queue can explicitly reject it, without waiting for a callback.
    return looper != null && new Handler(looper).post(runnable);
  }
}
