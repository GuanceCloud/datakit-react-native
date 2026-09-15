#import <XCTest/XCTest.h>
#import <QuartzCore/CADisplayLink.h>
#import <React/RCTBridge+Private.h>
#import <React/RCTBridgeProxy.h>
#import <GuanceSDK/FTExternalDataManager.h>
#import <objc/runtime.h>

#import "../../../packages/react-native-mobile/ios/FTJSLongTaskMonitor.h"
#import "../../../packages/react-native-mobile/ios/FTReactNativeRUM.h"

@interface FTReactNativeRUM (LongTaskLifecycleTests)
- (void)stopLongTaskTracking:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)applicationDidBecomeActive:(NSNotification *)notification;
- (void)applicationWillResignActive:(NSNotification *)notification;
- (void)invalidate;
- (id)setLongTaskContext:(NSDictionary *)context;
@end

@interface FTFakeJSQueue : NSObject <FTJSLongTaskQueue>
@property (nonatomic, strong) NSMutableArray *blocks;
@property (nonatomic, assign) BOOL acceptsBlocks;
@property (nonatomic, assign) BOOL dropsBlocks;
- (void)runAll;
@end

@implementation FTFakeJSQueue
- (instancetype)init {
  self = [super init];
  if (self) {
    _blocks = [NSMutableArray array];
    _acceptsBlocks = YES;
  }
  return self;
}

- (BOOL)dispatchBlock:(dispatch_block_t)block {
  if (!self.acceptsBlocks) {
    return NO;
  }
  if (!self.dropsBlocks) {
    [self.blocks addObject:[block copy]];
  }
  return YES;
}

- (void)runAll {
  while (self.blocks.count > 0) {
    dispatch_block_t block = self.blocks.firstObject;
    [self.blocks removeObjectAtIndex:0];
    block();
  }
}
@end

@interface FTThrowingLongTaskBridge : NSObject
@end

@implementation FTThrowingLongTaskBridge
- (void)dispatchBlock:(dispatch_block_t)block queue:(dispatch_queue_t)queue {
  [NSException raise:NSInternalInconsistencyException format:@"JS thread is unavailable"];
}
@end

@interface FTFakeFrameScheduler : NSObject <FTJSLongTaskFrameScheduler>
@property (nonatomic, copy) FTJSLongTaskFrameCallback callback;
@property (nonatomic, assign) NSUInteger startCount;
@property (nonatomic, assign) NSUInteger stopCount;
- (void)fire:(CFTimeInterval)timestamp;
@end

@implementation FTFakeFrameScheduler
- (void)start {
  self.startCount++;
}

- (void)stop {
  self.stopCount++;
}

- (void)fire:(CFTimeInterval)timestamp {
  self.callback(timestamp);
}
@end

@interface FTFakeFrameSchedulerFactory : NSObject <FTJSLongTaskFrameSchedulerFactory>
@property (nonatomic, strong) FTFakeFrameScheduler *scheduler;
@property (nonatomic, assign) NSUInteger createCount;
@property (nonatomic, copy) dispatch_block_t beforeCreate;
@end

@implementation FTFakeFrameSchedulerFactory
- (id<FTJSLongTaskFrameScheduler>)createSchedulerWithCallback:(FTJSLongTaskFrameCallback)callback {
  if (self.beforeCreate != nil) {
    self.beforeCreate();
  }
  self.createCount++;
  self.scheduler = [FTFakeFrameScheduler new];
  self.scheduler.callback = callback;
  return self.scheduler;
}
@end

@interface FTFakeLongTaskReporter : NSObject <FTJSLongTaskReporter>
@property (nonatomic, strong) NSMutableArray<NSNumber *> *durations;
@property (nonatomic, strong) NSMutableArray<NSDictionary *> *properties;
@end

@implementation FTFakeLongTaskReporter
- (instancetype)init {
  self = [super init];
  if (self) {
    _durations = [NSMutableArray array];
    _properties = [NSMutableArray array];
  }
  return self;
}

- (void)reportLongTaskWithDurationNanoseconds:(int64_t)durationNanoseconds property:(NSDictionary *)property {
  [self.durations addObject:@(durationNanoseconds)];
  [self.properties addObject:property];
}
@end

@interface FTJSLongTaskMonitorTests : XCTestCase
@property (nonatomic, strong) FTFakeJSQueue *queue;
@property (nonatomic, strong) FTFakeFrameSchedulerFactory *factory;
@property (nonatomic, strong) FTFakeLongTaskReporter *reporter;
@property (nonatomic, strong) FTJSLongTaskMonitor *monitor;
@property (nonatomic, strong) FTReactNativeRUM *rum;
@end

@implementation FTJSLongTaskMonitorTests

- (void)setUp {
  [super setUp];
  self.queue = [FTFakeJSQueue new];
  self.factory = [FTFakeFrameSchedulerFactory new];
  self.reporter = [FTFakeLongTaskReporter new];
  self.monitor = [[FTJSLongTaskMonitor alloc]
    initWithQueue:self.queue
    schedulerFactory:self.factory
    reporter:self.reporter];
}

- (void)tearDown {
  [self.rum invalidate];
  self.rum = nil;
  [self.queue runAll];
  [super tearDown];
}

- (void)createRUMWithMonitor {
  self.rum = [FTReactNativeRUM new];
  [self.rum setValue:self.monitor forKey:@"jsLongTaskMonitor"];
}

- (void)testBridgeContextUpdatesBeforeDelayedStartAndSnapshotsEachDetection {
  [self createRUMWithMonitor];
  NSString *sdkInfo = @"{\"react_native\":\"test-version\"}";
  [self.rum setLongTaskContext:@{@"sdk_bridge_info": sdkInfo, @"wgt_id": @"first"}];
  [self.monitor setThresholdMilliseconds:100];
  [self.monitor start];
  // The context changes while scheduler installation is still queued.
  [self.rum setLongTaskContext:@{@"sdk_bridge_info": sdkInfo, @"wgt_id": @"second"}];
  [self.queue runAll];
  [self.factory.scheduler fire:1.0];
  [self.factory.scheduler fire:1.25];
  NSDictionary *firstEvent = self.reporter.properties.firstObject;
  [self.rum setLongTaskContext:@{@"sdk_bridge_info": sdkInfo, @"wgt_id": @"third"}];
  [self.factory.scheduler fire:1.50];

  XCTAssertEqualObjects(self.reporter.durations, (@[@250000000, @250000000]));
  XCTAssertEqualObjects(firstEvent, (@{@"sdk_bridge_info": sdkInfo, @"wgt_id": @"second"}));
  XCTAssertEqualObjects(self.reporter.properties.lastObject, (@{@"sdk_bridge_info": sdkInfo, @"wgt_id": @"third"}));
  [self.monitor disableWithCompletion:nil];
  [self.rum setLongTaskContext:@{@"wgt_id": @"after-stop"}];
  [self.factory.scheduler fire:2.0];
  XCTAssertEqual(self.reporter.durations.count, 2u);
}

- (void)testNoBridgeContextReportsEmptyProperties {
  [self.monitor setThresholdMilliseconds:100];
  [self.monitor start];
  [self.queue runAll];
  [self.factory.scheduler fire:1.0];
  [self.factory.scheduler fire:1.25];
  XCTAssertEqualObjects(self.reporter.durations, (@[@250000000]));
  XCTAssertEqualObjects(self.reporter.properties, (@[@{}]));
}

- (void)testProductionReporterPassesContextToAddLongTaskWithStack {
  // This example links SDK classes into both its host and test bundle. Capture
  // both class references so the assertion observes the production reporter.
  Method method = class_getInstanceMethod([FTExternalDataManager class], @selector(addLongTaskWithStack:duration:property:));
  Method runtimeMethod = class_getInstanceMethod(NSClassFromString(@"FTExternalDataManager"), @selector(addLongTaskWithStack:duration:property:));
  __block NSDictionary *captured;
  IMP capture = imp_implementationWithBlock(^(id manager, NSString *stack, NSNumber *duration, NSDictionary *property) {
    captured = @{@"stack": stack, @"duration": duration, @"property": property};
  });
  IMP original = method_setImplementation(method, capture);
  IMP runtimeOriginal = runtimeMethod == method ? NULL : method_setImplementation(runtimeMethod, capture);
  @try {
    id<FTJSLongTaskReporter> reporter = [NSClassFromString(@"FTGuanceLongTaskReporter") new];
    self.monitor = [[FTJSLongTaskMonitor alloc] initWithQueue:self.queue schedulerFactory:self.factory reporter:reporter];
    NSDictionary *context = @{@"sdk_bridge_info": @"{\"react_native\":\"test-version\"}", @"wgt_id": @"example"};
    [self.monitor setBridgeContext:context];
    [self.monitor setThresholdMilliseconds:100];
    [self.monitor start];
    [self.queue runAll];
    [self.factory.scheduler fire:1.0];
    [self.factory.scheduler fire:1.25];
    [self.monitor setBridgeContext:@{@"wgt_id": @"later"}];
    XCTAssertEqualObjects(captured, (@{@"stack": @"", @"duration": @250000000, @"property": context}));
  } @finally {
    method_setImplementation(method, original);
    if (runtimeOriginal != NULL) {
      method_setImplementation(runtimeMethod, runtimeOriginal);
    }
    imp_removeBlock(capture);
  }
}

- (void)testSchedulerIsCreatedOnJSQueueAndThresholdIsStrict {
  [self.monitor setThresholdMilliseconds:125];
  [self.monitor start];

  XCTAssertEqual(self.factory.createCount, 0u);
  [self.queue runAll];
  XCTAssertEqual(self.factory.createCount, 1u);
  XCTAssertEqual(self.factory.scheduler.startCount, 1u);

  [self.factory.scheduler fire:1.0];
  [self.factory.scheduler fire:1.125];
  [self.factory.scheduler fire:1.250000001];

  XCTAssertEqual(self.reporter.durations.count, 1u);
  XCTAssertEqualWithAccuracy(self.reporter.durations.firstObject.longLongValue, 125000001LL, 1LL);
}

- (void)testFractionalThresholdPreservesNanosecondDuration {
  [self.monitor setThresholdMilliseconds:200.5];
  [self.monitor start];
  [self.queue runAll];

  [self.factory.scheduler fire:10.0];
  [self.factory.scheduler fire:10.2006];

  XCTAssertEqual(self.reporter.durations.count, 1u);
  XCTAssertEqualWithAccuracy(self.reporter.durations.firstObject.longLongValue, 200600000LL, 2LL);
}

- (void)testStopAndRestartResetBaseline {
  [self.monitor setThresholdMilliseconds:100];
  [self.monitor start];
  [self.queue runAll];
  FTFakeFrameScheduler *firstScheduler = self.factory.scheduler;
  [firstScheduler fire:1.0];

  [self.monitor stop];
  [firstScheduler fire:2.0];
  [self.queue runAll];

  XCTAssertEqual(firstScheduler.stopCount, 1u);
  XCTAssertEqual(self.reporter.durations.count, 0u);

  [self.monitor start];
  [self.queue runAll];
  [self.factory.scheduler fire:3.0];
  // A callback already in flight from the old scheduler must not change the new baseline.
  [firstScheduler fire:100.0];
  [self.factory.scheduler fire:3.100000001];

  XCTAssertEqual(self.reporter.durations.count, 1u);
}

- (void)testRepeatedStartKeepsOnlyLatestRequest {
  [self.monitor setThresholdMilliseconds:100];
  [self.monitor start];
  [self.monitor start];

  [self.queue runAll];

  XCTAssertEqual(self.factory.createCount, 1u);
  XCTAssertEqual(self.factory.scheduler.startCount, 1u);
}

- (void)testZeroThresholdDisablesMonitoring {
  [self.monitor setThresholdMilliseconds:100];
  [self.monitor start];
  [self.queue runAll];
  FTFakeFrameScheduler *scheduler = self.factory.scheduler;

  [self.monitor setThresholdMilliseconds:0];
  [self.queue runAll];
  [scheduler fire:1.0];
  [scheduler fire:2.0];

  XCTAssertEqual(scheduler.stopCount, 1u);
  XCTAssertEqual(self.reporter.durations.count, 0u);
}

- (void)testStopCompletionRunsAfterSchedulerInvalidation {
  [self.monitor setThresholdMilliseconds:100];
  [self.monitor start];
  [self.queue runAll];
  FTFakeFrameScheduler *scheduler = self.factory.scheduler;
  __block BOOL completed = NO;

  [self.monitor stopWithCompletion:^{
    XCTAssertEqual(scheduler.stopCount, 1u);
    completed = YES;
  }];

  XCTAssertTrue(completed);
  XCTAssertEqual(scheduler.stopCount, 1u);
}

- (void)testUnavailableQueueDisablesStartAndCompletesStop {
  self.queue.acceptsBlocks = NO;
  [self.monitor setThresholdMilliseconds:100];
  [self.monitor start];
  __block BOOL completed = NO;

  [self.monitor stopWithCompletion:^{
    completed = YES;
  }];

  XCTAssertEqual(self.factory.createCount, 0u);
  XCTAssertTrue(completed);
}

- (void)testSDKShutdownPreventsForegroundRestartUntilConfiguredAgain {
  [self createRUMWithMonitor];
  [self.monitor setThresholdMilliseconds:100];
  [self.rum applicationDidBecomeActive:nil];
  [self.queue runAll];
  FTFakeFrameScheduler *firstScheduler = self.factory.scheduler;
  [firstScheduler fire:1.0];
  __block NSUInteger completions = 0;

  [self.rum stopLongTaskTracking:^(id value) {
    completions++;
  } reject:nil];
  // A foreground event must not undo shutdown, even before another JS queue turn.
  [self.rum applicationDidBecomeActive:nil];
  [firstScheduler fire:1.5];
  XCTAssertEqual(completions, 1u);
  [self.queue runAll];

  XCTAssertEqual(completions, 1u);
  XCTAssertEqual(firstScheduler.stopCount, 1u);
  XCTAssertEqual(self.reporter.durations.count, 0u);
  [self.rum applicationWillResignActive:nil];
  [self.rum applicationDidBecomeActive:nil];
  [self.queue runAll];
  XCTAssertEqual(self.factory.createCount, 1u);

  // RUM configuration can explicitly re-enable the monitor with a new threshold.
  [self.monitor setThresholdMilliseconds:200];
  [self.rum applicationDidBecomeActive:nil];
  [self.queue runAll];
  XCTAssertEqual(self.factory.createCount, 2u);
  [self.factory.scheduler fire:10.0];
  [self.factory.scheduler fire:10.15];
  XCTAssertEqual(self.reporter.durations.count, 0u);
  [self.factory.scheduler fire:10.4];
  XCTAssertEqual(self.reporter.durations.count, 1u);
  XCTAssertEqualWithAccuracy(self.reporter.durations.firstObject.longLongValue, 250000000LL, 2LL);
}

- (void)testRepeatedSDKShutdownCancelsPendingStartAndCompletesEachRequest {
  [self createRUMWithMonitor];
  [self.monitor setThresholdMilliseconds:100];
  [self.rum applicationDidBecomeActive:nil];
  __block NSUInteger completions = 0;
  RCTPromiseResolveBlock completion = ^(id value) {
    completions++;
  };

  [self.rum stopLongTaskTracking:completion reject:nil];
  [self.rum stopLongTaskTracking:completion reject:nil];
  [self.rum applicationDidBecomeActive:nil];
  [self.queue runAll];

  XCTAssertEqual(completions, 2u);
  XCTAssertEqual(self.factory.createCount, 0u);
  XCTAssertEqual(self.reporter.durations.count, 0u);
}

- (void)testStoppedBridgeCleanupDoesNotThrowAndCompletes {
  // The real RN class with no JS thread reproduces the bridge teardown assertion.
  RCTCxxBridge *bridge = [RCTCxxBridge alloc];
  // Match a completed teardown so RN's own dealloc does not try to invalidate it again.
  [bridge setValue:@YES forKey:@"didInvalidate"];
  FTJSLongTaskMonitor *monitor = [FTJSLongTaskMonitor monitorWithBridge:bridge];
  __block NSUInteger completions = 0;

  XCTAssertNoThrow([monitor stopWithCompletion:^{ completions++; }]);
  XCTAssertEqual(completions, 1u);
  [self createRUMWithMonitor];
  [self.rum setValue:monitor forKey:@"jsLongTaskMonitor"];
  XCTAssertNoThrow([self.rum invalidate]);
  XCTAssertNoThrow([self.rum invalidate]);
  XCTAssertNoThrow(self.rum = nil);
}

- (void)testStoppedBridgeStartExceptionDoesNotEscape {
  RCTCxxBridge *bridge = [RCTCxxBridge alloc];
  [bridge setValue:@YES forKey:@"didInvalidate"];
  FTJSLongTaskMonitor *monitor = [FTJSLongTaskMonitor monitorWithBridge:bridge];
  [monitor setThresholdMilliseconds:100];

  XCTAssertNoThrow([monitor start]);
  XCTAssertNoThrow([monitor stop]);

  XCTAssertNil([monitor valueForKey:@"scheduler"]);
}

- (void)testBridgeDispatchExceptionLeavesMonitoringStopped {
  // Deterministic exception coverage also when RN assertions are disabled in Release.
  FTThrowingLongTaskBridge *bridge = [FTThrowingLongTaskBridge new];
  FTJSLongTaskMonitor *monitor = [FTJSLongTaskMonitor monitorWithBridge:(RCTBridge *)bridge];
  [monitor setThresholdMilliseconds:100];

  XCTAssertNoThrow([monitor start]);

  XCTAssertFalse([[monitor valueForKey:@"requestedRunning"] boolValue]);
  XCTAssertNil([monitor valueForKey:@"scheduler"]);
}

- (void)testRealBridgeProxyCanStartAndStopAfterItsDispatcherBecomesUnavailable {
  FTFakeJSQueue *queue = self.queue;
  char unusedRuntime;
  // A bridge proxy has no usable validity flag. It must still support normal starts.
  RCTBridgeProxy *proxy = [[RCTBridgeProxy alloc]
    initWithViewRegistry:[NSClassFromString(@"RCTViewRegistry") new]
    moduleRegistry:[NSClassFromString(@"RCTModuleRegistry") new]
    bundleManager:[NSClassFromString(@"RCTBundleManager") new]
    callableJSModules:[NSClassFromString(@"RCTCallableJSModules") new]
    dispatchToJSThread:^(dispatch_block_t block) { [queue dispatchBlock:block]; }
    registerSegmentWithId:^(NSNumber *segmentId, NSString *path) {}
    runtime:&unusedRuntime
    launchOptions:nil];
  FTJSLongTaskMonitor *monitor = [FTJSLongTaskMonitor monitorWithBridge:(RCTBridge *)proxy];
  __weak id weakScheduler;
  __weak CADisplayLink *weakDisplayLink;
  @autoreleasepool {
    [monitor setThresholdMilliseconds:100];
    [monitor start];
    [queue runAll];
    id scheduler = [monitor valueForKey:@"scheduler"];
    weakScheduler = scheduler;
    weakDisplayLink = [scheduler valueForKey:@"displayLink"];
    XCTAssertNotNil(weakDisplayLink);
  }
  queue.dropsBlocks = YES;
  __block NSUInteger completions = 0;

  XCTAssertNoThrow([monitor disableWithCompletion:^{ completions++; }]);

  XCTAssertEqual(completions, 1u);
  XCTAssertNil(weakScheduler);
  XCTAssertNil(weakDisplayLink);
}

- (void)testQueueRejectionStillInvalidatesSchedulerBeforeCompletion {
  [self.monitor setThresholdMilliseconds:100];
  [self.monitor start];
  [self.queue runAll];
  FTFakeFrameScheduler *scheduler = self.factory.scheduler;
  self.queue.acceptsBlocks = NO;
  __block NSUInteger completions = 0;

  [self.monitor stopWithCompletion:^{
    XCTAssertEqual(scheduler.stopCount, 1u);
    completions++;
  }];
  [scheduler fire:1];
  [scheduler fire:2];

  XCTAssertEqual(completions, 1u);
  XCTAssertEqual(scheduler.stopCount, 1u);
  XCTAssertEqual(self.reporter.durations.count, 0u);
}

- (void)testSilentlyDroppedQueueStillCleansUpAndCompletesShutdown {
  [self createRUMWithMonitor];
  [self.monitor setThresholdMilliseconds:100];
  [self.monitor start];
  [self.queue runAll];
  FTFakeFrameScheduler *scheduler = self.factory.scheduler;
  // RCTBridgeProxy can drop a block without returning a failure signal.
  self.queue.dropsBlocks = YES;
  __block NSUInteger completions = 0;

  [self.rum stopLongTaskTracking:^(id value) {
    XCTAssertEqual(scheduler.stopCount, 1u);
    completions++;
  } reject:nil];
  [self.rum invalidate];
  [self.rum invalidate];
  [self.rum applicationDidBecomeActive:nil];

  XCTAssertEqual(completions, 1u);
  XCTAssertEqual(scheduler.stopCount, 1u);
  XCTAssertEqual(self.factory.createCount, 1u);
}

- (void)testPendingStartDoesNotRetainDestroyedMonitor {
  [self.monitor setThresholdMilliseconds:100];
  [self.monitor start];
  __weak FTJSLongTaskMonitor *weakMonitor = self.monitor;

  self.monitor = nil;

  XCTAssertNil(weakMonitor);
  [self.queue runAll];
  XCTAssertEqual(self.factory.createCount, 0u);
}

- (void)testQueueLossReleasesRealDisplayLinkAndScheduler {
  id<FTJSLongTaskFrameSchedulerFactory> factory = [NSClassFromString(@"FTCADisplayLinkSchedulerFactory") new];
  XCTAssertNotNil(factory);
  self.monitor = [[FTJSLongTaskMonitor alloc] initWithQueue:self.queue
                                        schedulerFactory:factory
                                                reporter:self.reporter];
  __weak id weakScheduler;
  __weak CADisplayLink *weakDisplayLink;
  @autoreleasepool {
    [self.monitor setThresholdMilliseconds:100];
    [self.monitor start];
    [self.queue runAll];
    id scheduler = [self.monitor valueForKey:@"scheduler"];
    weakScheduler = scheduler;
    weakDisplayLink = [scheduler valueForKey:@"displayLink"];
    XCTAssertNotNil(weakDisplayLink);
  }
  self.queue.dropsBlocks = YES;

  [self.monitor stop];

  XCTAssertNil(weakScheduler);
  XCTAssertNil(weakDisplayLink);
}

- (void)testDeallocReleasesRealDisplayLinkWithoutQueueDispatch {
  id<FTJSLongTaskFrameSchedulerFactory> factory = [NSClassFromString(@"FTCADisplayLinkSchedulerFactory") new];
  self.monitor = [[FTJSLongTaskMonitor alloc] initWithQueue:self.queue
                                        schedulerFactory:factory
                                                reporter:self.reporter];
  __weak FTJSLongTaskMonitor *weakMonitor = self.monitor;
  __weak id weakScheduler;
  __weak CADisplayLink *weakDisplayLink;
  @autoreleasepool {
    [self.monitor setThresholdMilliseconds:100];
    [self.monitor start];
    [self.queue runAll];
    id scheduler = [self.monitor valueForKey:@"scheduler"];
    weakScheduler = scheduler;
    weakDisplayLink = [scheduler valueForKey:@"displayLink"];
    XCTAssertNotNil(weakDisplayLink);
  }
  self.queue.dropsBlocks = YES;

  self.monitor = nil;

  XCTAssertNil(weakMonitor);
  XCTAssertNil(weakScheduler);
  XCTAssertNil(weakDisplayLink);
}

- (void)testInvalidateCancelsPendingStartAndLateForegroundEvents {
  [self createRUMWithMonitor];
  [self.monitor setThresholdMilliseconds:100];
  [self.monitor start];

  [self.rum invalidate];
  [self.rum invalidate];
  [self.rum applicationDidBecomeActive:nil];
  [self.queue runAll];

  XCTAssertEqual(self.factory.createCount, 0u);
}

- (void)testRealDisplayLinkCanBeReleasedWhileJSThreadIsBlocked {
  id<FTJSLongTaskFrameSchedulerFactory> factory = [NSClassFromString(@"FTCADisplayLinkSchedulerFactory") new];
  self.monitor = [[FTJSLongTaskMonitor alloc] initWithQueue:self.queue
                                        schedulerFactory:factory
                                                reporter:self.reporter];
  [self.monitor setThresholdMilliseconds:100];
  [self.monitor start];
  dispatch_semaphore_t started = dispatch_semaphore_create(0);
  dispatch_semaphore_t unblock = dispatch_semaphore_create(0);
  XCTestExpectation *finished = [self expectationWithDescription:@"JS thread exits"];
  NSThread *jsThread = [[NSThread alloc] initWithBlock:^{
    @autoreleasepool {
      [self.queue runAll];
    }
    dispatch_semaphore_signal(started);
    // Keep the JS run loop unavailable until the caller has completed cleanup.
    dispatch_semaphore_wait(unblock, dispatch_time(DISPATCH_TIME_NOW, 5 * NSEC_PER_SEC));
    [finished fulfill];
  }];
  jsThread.qualityOfService = NSQualityOfServiceUserInteractive;
  [jsThread start];
  XCTAssertEqual(dispatch_semaphore_wait(started, dispatch_time(DISPATCH_TIME_NOW, 5 * NSEC_PER_SEC)), 0L);
  __weak id weakScheduler;
  __weak CADisplayLink *weakDisplayLink;
  @autoreleasepool {
    id scheduler = [self.monitor valueForKey:@"scheduler"];
    weakScheduler = scheduler;
    weakDisplayLink = [scheduler valueForKey:@"displayLink"];
    XCTAssertNotNil(weakDisplayLink);
  }
  __block BOOL completed = NO;

  [self.monitor stopWithCompletion:^{ completed = YES; }];

  XCTAssertTrue(completed);
  XCTAssertNil(weakScheduler);
  XCTAssertNil(weakDisplayLink);
  dispatch_semaphore_signal(unblock);
  [self waitForExpectations:@[finished] timeout:5];
}

- (void)testDisplayLinkDoesNotRetainItsOwningScheduler {
  id<FTJSLongTaskFrameSchedulerFactory> factory = [NSClassFromString(@"FTCADisplayLinkSchedulerFactory") new];
  __weak id weakScheduler;
  __weak CADisplayLink *weakDisplayLink;
  @autoreleasepool {
    id<FTJSLongTaskFrameScheduler> scheduler = [factory createSchedulerWithCallback:^(CFTimeInterval timestamp) {}];
    [scheduler start];
    weakScheduler = scheduler;
    weakDisplayLink = [(id)scheduler valueForKey:@"displayLink"];
    XCTAssertNotNil(weakDisplayLink);
    // Releasing the owner alone must reach dealloc and invalidate its display link.
  }

  XCTAssertNil(weakScheduler);
  XCTAssertNil(weakDisplayLink);
}

- (void)testShutdownRacingSchedulerCreationCannotLeaveItRunning {
  dispatch_semaphore_t creating = dispatch_semaphore_create(0);
  dispatch_semaphore_t allowCreation = dispatch_semaphore_create(0);
  XCTestExpectation *started = [self expectationWithDescription:@"Start request finishes"];
  XCTestExpectation *stopped = [self expectationWithDescription:@"Shutdown finishes"];
  self.factory.beforeCreate = ^{
    dispatch_semaphore_signal(creating);
    dispatch_semaphore_wait(allowCreation, dispatch_time(DISPATCH_TIME_NOW, 5 * NSEC_PER_SEC));
  };
  [self.monitor setThresholdMilliseconds:100];
  [self.monitor start];
  dispatch_queue_t worker = dispatch_get_global_queue(QOS_CLASS_USER_INTERACTIVE, 0);
  dispatch_async(worker, ^{
    [self.queue runAll];
    [started fulfill];
  });
  XCTAssertEqual(dispatch_semaphore_wait(creating, dispatch_time(DISPATCH_TIME_NOW, 5 * NSEC_PER_SEC)), 0L);
  self.queue.dropsBlocks = YES;
  dispatch_async(worker, ^{
    [self.monitor disableWithCompletion:^{ [stopped fulfill]; }];
  });
  dispatch_semaphore_signal(allowCreation);
  [self waitForExpectations:@[started, stopped] timeout:5];

  XCTAssertEqual(self.factory.scheduler.stopCount, 1u);
  XCTAssertNil([self.monitor valueForKey:@"scheduler"]);
  [self.monitor start];
  XCTAssertEqual(self.factory.createCount, 1u);
}

@end
