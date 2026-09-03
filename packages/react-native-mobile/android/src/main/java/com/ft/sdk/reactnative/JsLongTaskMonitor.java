package com.ft.sdk.reactnative;

import android.view.Choreographer;

import com.facebook.react.bridge.ReactApplicationContext;
import com.ft.sdk.FTRUMGlobalManager;

import java.util.HashMap;

final class JsLongTaskMonitor {

  private static final double NANOS_PER_MILLISECOND = 1_000_000d;

  interface Executor {
    void runOnJsThread(Runnable runnable);
  }

  interface FrameCallback {
    void doFrame(long frameTimeNanos);
  }

  interface FrameScheduler {
    void postFrameCallback();

    void removeFrameCallback();
  }

  interface FrameSchedulerFactory {
    FrameScheduler create(FrameCallback callback);
  }

  interface Reporter {
    void reportLongTask(long durationNanos);
  }

  private final Executor executor;
  private final FrameSchedulerFactory schedulerFactory;
  private final Reporter reporter;
  private final Object stateLock = new Object();
  private final FrameCallback frameCallback;

  private volatile long thresholdNanos;
  private volatile int generation;
  private volatile boolean requestedRunning;

  // Accessed only on the React Native JavaScript thread.
  private FrameScheduler scheduler;
  private int activeGeneration;
  private long lastFrameTimeNanos;

  static JsLongTaskMonitor create(ReactApplicationContext reactContext) {
    return new JsLongTaskMonitor(
      new ReactJsThreadExecutor(reactContext),
      new ChoreographerSchedulerFactory(),
      new GuanceLongTaskReporter()
    );
  }

  JsLongTaskMonitor(
    Executor executor,
    FrameSchedulerFactory schedulerFactory,
    Reporter reporter
  ) {
    this.executor = executor;
    this.schedulerFactory = schedulerFactory;
    this.reporter = reporter;
    this.frameCallback = new FrameCallback() {
      @Override
      public void doFrame(long frameTimeNanos) {
        handleFrame(frameTimeNanos);
      }
    };
  }

  void setThresholdMilliseconds(double thresholdMilliseconds) {
    thresholdNanos = thresholdMilliseconds <= 0
      ? 0
      : (long) (thresholdMilliseconds * NANOS_PER_MILLISECOND);
    if (thresholdNanos == 0) {
      stop();
    }
  }

  void start() {
    final int startGeneration;
    synchronized (stateLock) {
      if (thresholdNanos == 0) {
        return;
      }
      requestedRunning = true;
      startGeneration = ++generation;
    }
    try {
      executor.runOnJsThread(new Runnable() {
        @Override
        public void run() {
          if (!isCurrentRequest(startGeneration, true)) {
            return;
          }
          try {
            if (scheduler != null) {
              scheduler.removeFrameCallback();
            }
            scheduler = schedulerFactory.create(frameCallback);
            activeGeneration = startGeneration;
            lastFrameTimeNanos = 0;
            scheduler.postFrameCallback();
          } catch (IllegalStateException ignored) {
            disableRequestOnJsThread(startGeneration);
          }
        }
      });
    } catch (IllegalStateException ignored) {
      markRequestDisabled(startGeneration);
    }
  }

  void stop() {
    stop(null);
  }

  void stop(final Runnable completion) {
    final int stopGeneration;
    synchronized (stateLock) {
      requestedRunning = false;
      stopGeneration = ++generation;
    }
    try {
      executor.runOnJsThread(new Runnable() {
        @Override
        public void run() {
          if (isCurrentRequest(stopGeneration, false)) {
            try {
              if (scheduler != null) {
                scheduler.removeFrameCallback();
              }
            } catch (IllegalStateException ignored) {
              // The request is already disabled, so only local state needs clearing.
            }
            scheduler = null;
            activeGeneration = 0;
            lastFrameTimeNanos = 0;
          }
          runCompletion(completion);
        }
      });
    } catch (IllegalStateException ignored) {
      // The JavaScript queue may already be unavailable during teardown.
      runCompletion(completion);
    }
  }

  private boolean isCurrentRequest(int requestGeneration, boolean running) {
    synchronized (stateLock) {
      return generation == requestGeneration && requestedRunning == running;
    }
  }

  private void markRequestDisabled(int requestGeneration) {
    synchronized (stateLock) {
      if (generation == requestGeneration) {
        requestedRunning = false;
      }
    }
  }

  private void disableRequestOnJsThread(int requestGeneration) {
    markRequestDisabled(requestGeneration);
    scheduler = null;
    activeGeneration = 0;
    lastFrameTimeNanos = 0;
  }

  private static void runCompletion(Runnable completion) {
    if (completion != null) {
      completion.run();
    }
  }

  private void handleFrame(long frameTimeNanos) {
    if (!isCurrentRequest(activeGeneration, true) || scheduler == null) {
      return;
    }

    if (lastFrameTimeNanos != 0) {
      long durationNanos = frameTimeNanos - lastFrameTimeNanos;
      if (durationNanos > thresholdNanos) {
        try {
          reporter.reportLongTask(durationNanos);
        } catch (RuntimeException ignored) {
          // Reporting must not interrupt the JavaScript frame callback loop.
        }
      }
    }
    lastFrameTimeNanos = frameTimeNanos;

    if (isCurrentRequest(activeGeneration, true) && scheduler != null) {
      try {
        scheduler.postFrameCallback();
      } catch (IllegalStateException ignored) {
        disableRequestOnJsThread(activeGeneration);
      }
    }
  }

  private static final class ReactJsThreadExecutor implements Executor {
    private final ReactApplicationContext reactContext;

    private ReactJsThreadExecutor(ReactApplicationContext reactContext) {
      this.reactContext = reactContext;
    }

    @Override
    public void runOnJsThread(Runnable runnable) {
      reactContext.runOnJSQueueThread(runnable);
    }
  }

  private static final class ChoreographerSchedulerFactory implements FrameSchedulerFactory {
    @Override
    public FrameScheduler create(FrameCallback callback) {
      return new ChoreographerScheduler(Choreographer.getInstance(), callback);
    }
  }

  private static final class ChoreographerScheduler implements FrameScheduler {
    private final Choreographer choreographer;
    private final Choreographer.FrameCallback callback;

    private ChoreographerScheduler(
      Choreographer choreographer,
      final FrameCallback callback
    ) {
      this.choreographer = choreographer;
      this.callback = new Choreographer.FrameCallback() {
        @Override
        public void doFrame(long frameTimeNanos) {
          callback.doFrame(frameTimeNanos);
        }
      };
    }

    @Override
    public void postFrameCallback() {
      choreographer.postFrameCallback(callback);
    }

    @Override
    public void removeFrameCallback() {
      choreographer.removeFrameCallback(callback);
    }
  }

  private static final class GuanceLongTaskReporter implements Reporter {
    @Override
    public void reportLongTask(long durationNanos) {
      FTRUMGlobalManager.get().addLongTask(
        "",
        durationNanos,
        new HashMap<String, Object>()
      );
    }
  }
}
