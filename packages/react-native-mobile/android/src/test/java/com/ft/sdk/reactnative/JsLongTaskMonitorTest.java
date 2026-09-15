package com.ft.sdk.reactnative;

import org.junit.Before;
import org.junit.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Collections;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public class JsLongTaskMonitorTest {

  private FakeExecutor executor;
  private FakeSchedulerFactory schedulerFactory;
  private FakeReporter reporter;
  private JsLongTaskMonitor monitor;

  @Before
  public void setUp() {
    executor = new FakeExecutor();
    schedulerFactory = new FakeSchedulerFactory();
    reporter = new FakeReporter();
    monitor = new JsLongTaskMonitor(executor, schedulerFactory, reporter);
  }

  @Test
  public void createsFrameSchedulerOnlyOnJsThread() {
    monitor.setThresholdMilliseconds(100);
    monitor.start();

    assertEquals(0, schedulerFactory.createCount);
    assertEquals(1, executor.runnables.size());

    executor.runAll();

    assertEquals(1, schedulerFactory.createCount);
    assertEquals(1, schedulerFactory.scheduler.postCount);
  }

  @Test
  public void bridgeContextUpdatesBeforeDelayedStartAndSnapshotsEachDetection() {
    Map<String, Object> context = new HashMap<>();
    context.put("sdk_bridge_info", "{\"react_native\":\"test-version\"}");
    context.put("wgt_id", "first");
    monitor.setBridgeContext(context);
    monitor.setThresholdMilliseconds(100);
    monitor.start();
    context.put("wgt_id", "second");
    monitor.setBridgeContext(context);
    executor.runAll();
    schedulerFactory.scheduler.fire(1_000_000_000L);
    schedulerFactory.scheduler.fire(1_250_000_000L);
    Map<String, Object> firstEvent = reporter.properties.get(0);
    Map<String, Object> expected = new HashMap<>(context);
    context.put("wgt_id", "third");
    monitor.setBridgeContext(context);
    schedulerFactory.scheduler.fire(1_500_000_000L);

    assertEquals(java.util.Arrays.asList(250_000_000L, 250_000_000L), reporter.durations);
    assertEquals(expected, firstEvent);
    assertEquals(context, reporter.properties.get(1));
    monitor.disable(null);
    context.put("wgt_id", "after-stop");
    monitor.setBridgeContext(context);
    schedulerFactory.scheduler.fire(2_000_000_000L);
    assertEquals(2, reporter.durations.size());
  }

  @Test
  public void noBridgeContextReportsEmptyProperties() {
    startWithThreshold(100);
    schedulerFactory.scheduler.fire(1_000_000_000L);
    schedulerFactory.scheduler.fire(1_250_000_000L);
    assertEquals(250_000_000L, reporter.durations.get(0).longValue());
    assertEquals(Collections.emptyMap(), reporter.properties.get(0));
  }

  @Test
  public void firstFrameIsBaselineAndThresholdComparisonIsStrict() {
    startWithThreshold(100);

    schedulerFactory.scheduler.fire(1_000_000_000L);
    schedulerFactory.scheduler.fire(1_100_000_000L);
    schedulerFactory.scheduler.fire(1_200_000_001L);

    assertEquals(1, reporter.durations.size());
    assertEquals(100_000_001L, reporter.durations.get(0).longValue());
  }

  @Test
  public void reportsEveryQualifyingFullFrameInterval() {
    startWithThreshold(100);

    schedulerFactory.scheduler.fire(1_000_000_000L);
    schedulerFactory.scheduler.fire(1_050_000_000L);
    schedulerFactory.scheduler.fire(1_200_000_000L);
    schedulerFactory.scheduler.fire(1_450_000_000L);

    assertEquals(2, reporter.durations.size());
    assertEquals(150_000_000L, reporter.durations.get(0).longValue());
    assertEquals(250_000_000L, reporter.durations.get(1).longValue());
  }

  @Test
  public void preservesFractionalMillisecondThresholds() {
    startWithThreshold(200.5);

    schedulerFactory.scheduler.fire(1_000_000_000L);
    schedulerFactory.scheduler.fire(1_200_500_000L);
    schedulerFactory.scheduler.fire(1_401_000_001L);

    assertEquals(1, reporter.durations.size());
    assertEquals(200_500_001L, reporter.durations.get(0).longValue());
  }

  @Test
  public void stopRemovesCallbackAndRestartResetsBaseline() {
    startWithThreshold(100);
    FakeScheduler firstScheduler = schedulerFactory.scheduler;
    firstScheduler.fire(1_000_000_000L);

    monitor.stop();
    firstScheduler.fire(1_500_000_000L);
    executor.runAll();

    assertEquals(1, firstScheduler.removeCount);
    assertTrue(reporter.durations.isEmpty());

    monitor.start();
    executor.runAll();
    FakeScheduler secondScheduler = schedulerFactory.scheduler;
    secondScheduler.fire(2_000_000_000L);
    secondScheduler.fire(2_100_000_001L);

    assertEquals(1, reporter.durations.size());
    assertEquals(100_000_001L, reporter.durations.get(0).longValue());
  }

  @Test
  public void repeatedStartKeepsOnlyLatestRequest() {
    monitor.setThresholdMilliseconds(100);
    monitor.start();
    monitor.start();

    executor.runAll();

    assertEquals(1, schedulerFactory.createCount);
    assertEquals(1, schedulerFactory.scheduler.postCount);
  }

  @Test
  public void zeroThresholdDisablesMonitoring() {
    startWithThreshold(100);
    FakeScheduler scheduler = schedulerFactory.scheduler;

    monitor.setThresholdMilliseconds(0);
    executor.runAll();
    scheduler.fire(1_000_000_000L);
    scheduler.fire(2_000_000_000L);

    assertEquals(1, scheduler.removeCount);
    assertTrue(reporter.durations.isEmpty());
  }

  @Test
  public void schedulerFailureDoesNotCrashOrPostFrames() {
    schedulerFactory.shouldThrow = true;
    monitor.setThresholdMilliseconds(100);
    monitor.start();

    executor.runAll();

    assertEquals(1, schedulerFactory.createCount);
    assertFalse(schedulerFactory.scheduler.wasPosted);
  }

  @Test
  public void javascriptQueueFailureDoesNotCrash() {
    executor.shouldThrow = true;
    monitor.setThresholdMilliseconds(100);

    monitor.start();
    monitor.stop();

    assertEquals(0, schedulerFactory.createCount);
  }

  @Test
  public void rejectedStartDoesNotCreateScheduler() {
    executor.acceptsTasks = false;
    monitor.setThresholdMilliseconds(100);

    monitor.start();

    assertEquals(0, schedulerFactory.createCount);
    assertTrue(executor.runnables.isEmpty());
  }

  @Test
  public void rejectedStopCompletesAndSuppressesExistingFrameCallbacks() {
    startWithThreshold(100);
    FakeScheduler scheduler = schedulerFactory.scheduler;
    scheduler.fire(1_000_000_000L);
    int posts = scheduler.postCount;
    executor.acceptsTasks = false;
    final int[] completions = {0};

    monitor.disable(() -> completions[0]++);
    scheduler.fire(1_500_000_000L);
    monitor.start();

    assertEquals(1, completions[0]);
    assertEquals(posts, scheduler.postCount);
    assertEquals(1, schedulerFactory.createCount);
    assertTrue(reporter.durations.isEmpty());
  }

  @Test
  public void throwingQueueCompletesStopExactlyOnce() {
    executor.shouldThrow = true;
    final int[] completions = {0};

    monitor.stop(() -> completions[0]++);

    assertEquals(1, completions[0]);
  }

  @Test
  public void inlineCompletionFailureIsNotInvokedTwice() {
    JsLongTaskMonitor inlineMonitor = new JsLongTaskMonitor(
      runnable -> {
        runnable.run();
        return true;
      },
      schedulerFactory,
      reporter
    );
    final int[] completions = {0};

    inlineMonitor.stop(() -> {
      completions[0]++;
      throw new IllegalStateException("Promise is already unavailable");
    });

    assertEquals(1, completions[0]);
  }

  @Test
  public void framePostFailureDisablesMonitoring() {
    schedulerFactory.throwOnPost = true;
    monitor.setThresholdMilliseconds(100);

    monitor.start();
    executor.runAll();

    assertEquals(1, schedulerFactory.createCount);
    assertFalse(schedulerFactory.scheduler.wasPosted);
  }

  @Test
  public void stopCompletionRunsAfterCallbackRemoval() {
    startWithThreshold(100);
    final boolean[] completed = {false};

    monitor.stop(new Runnable() {
      @Override
      public void run() {
        completed[0] = true;
      }
    });

    assertFalse(completed[0]);
    assertEquals(0, schedulerFactory.scheduler.removeCount);

    executor.runAll();

    assertTrue(completed[0]);
    assertEquals(1, schedulerFactory.scheduler.removeCount);
  }

  @Test
  public void disablePreventsRestartUntilConfiguredAgain() {
    startWithThreshold(100);
    FakeScheduler firstScheduler = schedulerFactory.scheduler;
    firstScheduler.fire(1_000_000_000L);
    final int[] completions = {0};

    monitor.disable(() -> completions[0]++);
    // A foreground event can arrive before the JS queue finishes stopping.
    monitor.start();
    firstScheduler.fire(1_500_000_000L);
    assertEquals(0, completions[0]);
    executor.runAll();

    assertEquals(1, completions[0]);
    assertEquals(1, firstScheduler.removeCount);
    assertTrue(reporter.durations.isEmpty());

    // Further background/foreground transitions must not re-enable monitoring.
    monitor.stop();
    monitor.start();
    executor.runAll();
    assertEquals(1, schedulerFactory.createCount);

    monitor.setThresholdMilliseconds(200);
    monitor.start();
    executor.runAll();
    assertEquals(2, schedulerFactory.createCount);
    schedulerFactory.scheduler.fire(10_000_000_000L);
    schedulerFactory.scheduler.fire(10_150_000_000L);
    assertTrue(reporter.durations.isEmpty());
    schedulerFactory.scheduler.fire(10_400_000_000L);
    assertEquals(1, reporter.durations.size());
    assertEquals(250_000_000L, reporter.durations.get(0).longValue());
  }

  @Test
  public void repeatedDisableCancelsPendingStartAndCompletesEachRequest() {
    monitor.setThresholdMilliseconds(100);
    monitor.start();
    final int[] completions = {0};

    monitor.disable(() -> completions[0]++);
    monitor.disable(() -> completions[0]++);
    monitor.start();
    executor.runAll();

    assertEquals(2, completions[0]);
    assertEquals(0, schedulerFactory.createCount);
    assertTrue(reporter.durations.isEmpty());
  }

  @Test
  public void reporterFailureDoesNotStopFrameCallbacks() {
    reporter.shouldThrow = true;
    startWithThreshold(100);
    int initialPostCount = schedulerFactory.scheduler.postCount;

    schedulerFactory.scheduler.fire(1_000_000_000L);
    schedulerFactory.scheduler.fire(1_200_000_000L);

    assertEquals(initialPostCount + 2, schedulerFactory.scheduler.postCount);
  }

  private void startWithThreshold(double thresholdMilliseconds) {
    monitor.setThresholdMilliseconds(thresholdMilliseconds);
    monitor.start();
    executor.runAll();
  }

  private static final class FakeExecutor implements JsLongTaskMonitor.Executor {
    private final List<Runnable> runnables = new ArrayList<>();
    private boolean shouldThrow;
    private boolean acceptsTasks = true;

    @Override
    public boolean runOnJsThread(Runnable runnable) {
      if (shouldThrow) {
        throw new IllegalStateException("JavaScript queue unavailable");
      }
      if (!acceptsTasks) {
        return false;
      }
      runnables.add(runnable);
      return true;
    }

    private void runAll() {
      while (!runnables.isEmpty()) {
        runnables.remove(0).run();
      }
    }
  }

  private static final class FakeSchedulerFactory
    implements JsLongTaskMonitor.FrameSchedulerFactory {
    private int createCount;
    private boolean shouldThrow;
    private boolean throwOnPost;
    private FakeScheduler scheduler = new FakeScheduler();

    @Override
    public JsLongTaskMonitor.FrameScheduler create(
      JsLongTaskMonitor.FrameCallback callback
    ) {
      createCount++;
      if (shouldThrow) {
        throw new IllegalStateException("No looper");
      }
      scheduler = new FakeScheduler();
      scheduler.callback = callback;
      scheduler.throwOnPost = throwOnPost;
      return scheduler;
    }
  }

  private static final class FakeScheduler
    implements JsLongTaskMonitor.FrameScheduler {
    private JsLongTaskMonitor.FrameCallback callback;
    private int postCount;
    private int removeCount;
    private boolean wasPosted;
    private boolean throwOnPost;

    @Override
    public void postFrameCallback() {
      if (throwOnPost) {
        throw new IllegalStateException("Frame scheduler unavailable");
      }
      postCount++;
      wasPosted = true;
    }

    @Override
    public void removeFrameCallback() {
      removeCount++;
      wasPosted = false;
    }

    private void fire(long timestampNanos) {
      if (callback != null) {
        callback.doFrame(timestampNanos);
      }
    }
  }

  private static final class FakeReporter implements JsLongTaskMonitor.Reporter {
    private final List<Long> durations = new ArrayList<>();
    private final List<Map<String, Object>> properties = new ArrayList<>();
    private boolean shouldThrow;

    @Override
    public void reportLongTask(long durationNanos, Map<String, Object> property) {
      if (shouldThrow) {
        throw new IllegalStateException("Reporter unavailable");
      }
      durations.add(durationNanos);
      properties.add(property);
    }
  }
}
