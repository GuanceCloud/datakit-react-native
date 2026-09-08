package com.ft.sdk.reactnative;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;

import org.junit.Test;

import java.lang.reflect.Method;

import static org.junit.Assume.assumeTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

public class FTRUMModuleTest {
  @Test
  public void shutdownResolvesWhenJSQueueIsUnavailable() {
    ReactApplicationContext context = mock(ReactApplicationContext.class);
    FTRUMModule module = new FTRUMModule(context);
    Promise promise = mock(Promise.class);

    module.stopLongTaskTracking(promise);

    verify(promise, times(1)).resolve(null);
    verifyNoMoreInteractions(promise);
  }

  @Test
  public void shutdownResolvesWhenRNRejectsDispatch() throws Exception {
    Method dispatch = ReactApplicationContext.class.getMethod("runOnJSQueueThread", Runnable.class);
    // RN 0.63 has a void API. Reflection keeps this test compilable on both APIs.
    assumeTrue(dispatch.getReturnType() == boolean.class);
    ReactApplicationContext context = mock(ReactApplicationContext.class);
    when(dispatch.invoke(context, any(Runnable.class))).thenReturn(false);
    FTRUMModule module = new FTRUMModule(context);
    Promise promise = mock(Promise.class);

    module.stopLongTaskTracking(promise);

    dispatch.invoke(verify(context, times(1)), any(Runnable.class));
    verify(promise, times(1)).resolve(null);
    verifyNoMoreInteractions(promise);
  }

  @Test
  public void shutdownResolvesWhenRNQueueIsNotInitialized() throws Exception {
    Method dispatch = ReactApplicationContext.class.getMethod("runOnJSQueueThread", Runnable.class);
    assumeTrue(dispatch.getReturnType() == boolean.class);
    ReactApplicationContext context = mock(ReactApplicationContext.class);
    when(dispatch.invoke(context, any(Runnable.class))).thenThrow(new AssertionError("JS queue is null"));
    FTRUMModule module = new FTRUMModule(context);
    Promise promise = mock(Promise.class);

    module.stopLongTaskTracking(promise);

    verify(promise, times(1)).resolve(null);
    verifyNoMoreInteractions(promise);
  }

  @Test
  public void invalidateAndLegacyDestroyShareOneCleanup() {
    ReactApplicationContext context = mock(ReactApplicationContext.class);
    FTRUMModule module = new FTRUMModule(context);

    module.invalidate();
    module.invalidate();
    module.onCatalystInstanceDestroy();

    verify(context, times(1)).removeLifecycleEventListener(any(FTRUMImpl.class));
  }

  @Test
  public void legacyDestroyThenInvalidateAlsoCleansUpOnce() {
    ReactApplicationContext context = mock(ReactApplicationContext.class);
    FTRUMModule module = new FTRUMModule(context);

    module.onCatalystInstanceDestroy();
    module.invalidate();

    verify(context, times(1)).removeLifecycleEventListener(any(FTRUMImpl.class));
  }

  @Test
  public void destroyedRUMDoesNotResumeMonitoring() {
    ReactApplicationContext context = mock(ReactApplicationContext.class);
    JsLongTaskMonitor.Executor executor = mock(JsLongTaskMonitor.Executor.class);
    JsLongTaskMonitor monitor = new JsLongTaskMonitor(
      executor,
      mock(JsLongTaskMonitor.FrameSchedulerFactory.class),
      mock(JsLongTaskMonitor.Reporter.class)
    );
    FTRUMImpl rum = new FTRUMImpl(context, monitor);

    rum.destroy();
    rum.destroy();
    monitor.setThresholdMilliseconds(100);
    rum.onHostResume();

    verify(context, times(1)).removeLifecycleEventListener(rum);
    verify(executor, times(1)).runOnJsThread(any(Runnable.class));
    verifyNoMoreInteractions(executor);
  }
}
