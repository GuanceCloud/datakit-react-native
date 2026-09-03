#import <XCTest/XCTest.h>

#import "../../../packages/react-native-mobile/ios/FTJSLongTaskMonitor.h"

@interface FTFakeJSQueue : NSObject <FTJSLongTaskQueue>
@property (nonatomic, strong) NSMutableArray *blocks;
@property (nonatomic, assign) BOOL acceptsBlocks;
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
  [self.blocks addObject:[block copy]];
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
@end

@implementation FTFakeFrameSchedulerFactory
- (id<FTJSLongTaskFrameScheduler>)createSchedulerWithCallback:(FTJSLongTaskFrameCallback)callback {
  self.createCount++;
  self.scheduler = [FTFakeFrameScheduler new];
  self.scheduler.callback = callback;
  return self.scheduler;
}
@end

@interface FTFakeLongTaskReporter : NSObject <FTJSLongTaskReporter>
@property (nonatomic, strong) NSMutableArray<NSNumber *> *durations;
@end

@implementation FTFakeLongTaskReporter
- (instancetype)init {
  self = [super init];
  if (self) {
    _durations = [NSMutableArray array];
  }
  return self;
}

- (void)reportLongTaskWithDurationNanoseconds:(int64_t)durationNanoseconds {
  [self.durations addObject:@(durationNanoseconds)];
}
@end

@interface FTJSLongTaskMonitorTests : XCTestCase
@property (nonatomic, strong) FTFakeJSQueue *queue;
@property (nonatomic, strong) FTFakeFrameSchedulerFactory *factory;
@property (nonatomic, strong) FTFakeLongTaskReporter *reporter;
@property (nonatomic, strong) FTJSLongTaskMonitor *monitor;
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
    completed = YES;
  }];

  XCTAssertFalse(completed);
  XCTAssertEqual(scheduler.stopCount, 0u);

  [self.queue runAll];

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

@end
