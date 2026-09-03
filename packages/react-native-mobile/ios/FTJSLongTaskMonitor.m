#import "FTJSLongTaskMonitor.h"

#import <QuartzCore/CADisplayLink.h>
#import <GuanceSDK/FTExternalDataManager.h>
#import <React/RCTBridge.h>
#import <React/RCTBridge+Private.h>
#import <React/RCTJSThread.h>

static const double FTNanosecondsPerSecond = 1000000000.0;

@interface FTReactBridgeJSQueue : NSObject <FTJSLongTaskQueue>
@property (nonatomic, weak) RCTBridge *bridge;
- (instancetype)initWithBridge:(RCTBridge *)bridge;
@end

@implementation FTReactBridgeJSQueue
- (instancetype)initWithBridge:(RCTBridge *)bridge {
  self = [super init];
  if (self) {
    _bridge = bridge;
  }
  return self;
}

- (BOOL)dispatchBlock:(dispatch_block_t)block {
  RCTBridge *bridge = self.bridge;
  if (bridge == nil) {
    return NO;
  }
  [bridge dispatchBlock:block queue:RCTJSThread];
  return YES;
}
@end

@interface FTCADisplayLinkScheduler : NSObject <FTJSLongTaskFrameScheduler>
@property (nonatomic, copy) FTJSLongTaskFrameCallback callback;
@property (nonatomic, strong, nullable) CADisplayLink *displayLink;
- (instancetype)initWithCallback:(FTJSLongTaskFrameCallback)callback;
@end

@implementation FTCADisplayLinkScheduler
- (instancetype)initWithCallback:(FTJSLongTaskFrameCallback)callback {
  self = [super init];
  if (self) {
    _callback = [callback copy];
  }
  return self;
}

- (void)start {
  [self stop];
  self.displayLink = [CADisplayLink displayLinkWithTarget:self selector:@selector(displayLinkDidFire:)];
  [self.displayLink addToRunLoop:[NSRunLoop currentRunLoop] forMode:NSRunLoopCommonModes];
}

- (void)stop {
  [self.displayLink invalidate];
  self.displayLink = nil;
}

- (void)displayLinkDidFire:(CADisplayLink *)displayLink {
  self.callback(displayLink.timestamp);
}

- (void)dealloc {
  [self stop];
}
@end

@interface FTCADisplayLinkSchedulerFactory : NSObject <FTJSLongTaskFrameSchedulerFactory>
@end

@implementation FTCADisplayLinkSchedulerFactory
- (id<FTJSLongTaskFrameScheduler>)createSchedulerWithCallback:(FTJSLongTaskFrameCallback)callback {
  return [[FTCADisplayLinkScheduler alloc] initWithCallback:callback];
}
@end

@interface FTGuanceLongTaskReporter : NSObject <FTJSLongTaskReporter>
@end

@implementation FTGuanceLongTaskReporter
- (void)reportLongTaskWithDurationNanoseconds:(int64_t)durationNanoseconds {
  [[FTExternalDataManager sharedManager]
    addLongTaskWithStack:@""
    duration:@(durationNanoseconds)
    property:@{}];
}
@end

@interface FTJSLongTaskMonitor ()
@property (nonatomic, strong) id<FTJSLongTaskQueue> queue;
@property (nonatomic, strong) id<FTJSLongTaskFrameSchedulerFactory> schedulerFactory;
@property (nonatomic, strong) id<FTJSLongTaskReporter> reporter;
@property (nonatomic, strong) NSObject *stateLock;
@property (nonatomic, assign) NSTimeInterval thresholdSeconds;
@property (nonatomic, assign) NSUInteger generation;
@property (nonatomic, assign) BOOL requestedRunning;
@property (nonatomic, strong, nullable) id<FTJSLongTaskFrameScheduler> scheduler;
@property (nonatomic, assign) NSUInteger activeGeneration;
@property (nonatomic, assign) CFTimeInterval lastFrameTimestamp;
@end

@implementation FTJSLongTaskMonitor

+ (instancetype)monitorWithBridge:(RCTBridge *)bridge {
  return [[self alloc]
    initWithQueue:[[FTReactBridgeJSQueue alloc] initWithBridge:bridge]
    schedulerFactory:[FTCADisplayLinkSchedulerFactory new]
    reporter:[FTGuanceLongTaskReporter new]];
}

- (instancetype)initWithQueue:(id<FTJSLongTaskQueue>)queue
              schedulerFactory:(id<FTJSLongTaskFrameSchedulerFactory>)schedulerFactory
                       reporter:(id<FTJSLongTaskReporter>)reporter {
  self = [super init];
  if (self) {
    _queue = queue;
    _schedulerFactory = schedulerFactory;
    _reporter = reporter;
    _stateLock = [NSObject new];
  }
  return self;
}

- (void)setThresholdMilliseconds:(double)thresholdMilliseconds {
  @synchronized (self.stateLock) {
    self.thresholdSeconds = thresholdMilliseconds <= 0 ? 0 : thresholdMilliseconds / 1000.0;
  }
  if (thresholdMilliseconds <= 0) {
    [self stop];
  }
}

- (void)start {
  __block NSUInteger startGeneration;
  @synchronized (self.stateLock) {
    if (self.thresholdSeconds == 0) {
      return;
    }
    self.requestedRunning = YES;
    startGeneration = ++self.generation;
  }

  BOOL dispatched = [self.queue dispatchBlock:^{
    if (![self isCurrentGeneration:startGeneration running:YES]) {
      return;
    }
    [self.scheduler stop];
    __weak typeof(self) weakSelf = self;
    self.scheduler = [self.schedulerFactory createSchedulerWithCallback:^(CFTimeInterval timestamp) {
      [weakSelf handleFrameTimestamp:timestamp];
    }];
    self.activeGeneration = startGeneration;
    self.lastFrameTimestamp = 0;
    [self.scheduler start];
  }];
  if (!dispatched) {
    @synchronized (self.stateLock) {
      if (self.generation == startGeneration) {
        self.requestedRunning = NO;
      }
    }
  }
}

- (void)stop {
  [self stopWithCompletion:nil];
}

- (void)stopWithCompletion:(dispatch_block_t)completion {
  __block NSUInteger stopGeneration;
  @synchronized (self.stateLock) {
    self.requestedRunning = NO;
    stopGeneration = ++self.generation;
  }

  BOOL dispatched = [self.queue dispatchBlock:^{
    if ([self isCurrentGeneration:stopGeneration running:NO]) {
      [self.scheduler stop];
      self.scheduler = nil;
      self.activeGeneration = 0;
      self.lastFrameTimestamp = 0;
    }
    if (completion != nil) {
      completion();
    }
  }];
  if (!dispatched && completion != nil) {
    completion();
  }
}

- (BOOL)isCurrentGeneration:(NSUInteger)generation running:(BOOL)running {
  @synchronized (self.stateLock) {
    return self.generation == generation && self.requestedRunning == running;
  }
}

- (void)handleFrameTimestamp:(CFTimeInterval)timestamp {
  if (![self isCurrentGeneration:self.activeGeneration running:YES] || self.scheduler == nil) {
    return;
  }

  __block NSTimeInterval thresholdSeconds;
  @synchronized (self.stateLock) {
    thresholdSeconds = self.thresholdSeconds;
  }
  if (self.lastFrameTimestamp != 0) {
    NSTimeInterval duration = timestamp - self.lastFrameTimestamp;
    if (duration > thresholdSeconds) {
      int64_t durationNanoseconds = (int64_t)(duration * FTNanosecondsPerSecond);
      [self.reporter reportLongTaskWithDurationNanoseconds:durationNanoseconds];
    }
  }
  self.lastFrameTimestamp = timestamp;
}

@end
