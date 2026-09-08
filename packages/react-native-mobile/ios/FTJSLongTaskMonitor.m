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
  @try {
    // RCTBridgeProxy.valid is always NO, including while bridgeless RN is active.
    [bridge dispatchBlock:block queue:RCTJSThread];
    return YES;
  } @catch (NSException *exception) {
    // Bridge teardown may race a start request. Monitoring must not take down the host.
    return NO;
  }
}
@end

// The display link retains this callback target, not the scheduler that owns it.
@interface FTJSLongTaskDisplayLinkTarget : NSObject
@property (nonatomic, copy) FTJSLongTaskFrameCallback callback;
@end

@implementation FTJSLongTaskDisplayLinkTarget
- (void)displayLinkDidFire:(CADisplayLink *)displayLink {
  self.callback(displayLink.timestamp);
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
  FTJSLongTaskDisplayLinkTarget *target = [FTJSLongTaskDisplayLinkTarget new];
  target.callback = self.callback;
  self.displayLink = [CADisplayLink displayLinkWithTarget:target selector:@selector(displayLinkDidFire:)];
  [self.displayLink addToRunLoop:[NSRunLoop currentRunLoop] forMode:NSRunLoopCommonModes];
}

- (void)stop {
  // CADisplayLink.invalidate is thread safe and releases its run loop and target
  // references without requiring a live JS queue.
  [self.displayLink invalidate];
  self.displayLink = nil;
}

- (void)dealloc {
  [_displayLink invalidate];
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
    if (thresholdMilliseconds <= 0) {
      [self stopLocked];
    }
  }
}

- (void)start {
  NSUInteger startGeneration;
  @synchronized (self.stateLock) {
    if (self.thresholdSeconds == 0) {
      return;
    }
    self.requestedRunning = YES;
    startGeneration = ++self.generation;
  }

  __weak typeof(self) weakSelf = self;
  BOOL dispatched = [self.queue dispatchBlock:^{
    // A pending block must not keep a destroyed monitor (and its queue) alive.
    typeof(self) strongSelf = weakSelf;
    if (strongSelf == nil) {
      return;
    }
    @synchronized (strongSelf.stateLock) {
      if (strongSelf.generation != startGeneration || !strongSelf.requestedRunning) {
        return;
      }
      [strongSelf.scheduler stop];
      strongSelf.scheduler = [strongSelf.schedulerFactory createSchedulerWithCallback:^(CFTimeInterval timestamp) {
        [weakSelf handleFrameTimestamp:timestamp generation:startGeneration];
      }];
      strongSelf.activeGeneration = startGeneration;
      strongSelf.lastFrameTimestamp = 0;
      [strongSelf.scheduler start];
    }
  }];
  if (!dispatched) {
    @synchronized (self.stateLock) {
      if (self.generation == startGeneration) {
        [self stopLocked];
      }
    }
  }
}

- (void)stop {
  [self stopWithCompletion:nil];
}

- (void)disableWithCompletion:(dispatch_block_t)completion {
  @synchronized (self.stateLock) {
    self.thresholdSeconds = 0;
    [self stopLocked];
  }
  if (completion != nil) {
    completion();
  }
}

- (void)stopWithCompletion:(dispatch_block_t)completion {
  @synchronized (self.stateLock) {
    [self stopLocked];
  }
  if (completion != nil) {
    completion();
  }
}

// Caller holds stateLock, also used by scheduler installation and frame callbacks.
// Cleanup deliberately never dispatches to RN: an invalid proxy may silently drop it.
- (void)stopLocked {
  self.requestedRunning = NO;
  self.generation++;
  [self.scheduler stop];
  self.scheduler = nil;
  self.activeGeneration = 0;
  self.lastFrameTimestamp = 0;
}

- (void)handleFrameTimestamp:(CFTimeInterval)timestamp generation:(NSUInteger)generation {
  @synchronized (self.stateLock) {
    if (!self.requestedRunning || self.generation != generation ||
        self.activeGeneration != generation || self.scheduler == nil) {
      return;
    }
    if (self.lastFrameTimestamp != 0) {
      NSTimeInterval duration = timestamp - self.lastFrameTimestamp;
      if (duration > self.thresholdSeconds) {
        int64_t durationNanoseconds = (int64_t)(duration * FTNanosecondsPerSecond);
        [self.reporter reportLongTaskWithDurationNanoseconds:durationNanoseconds];
      }
    }
    self.lastFrameTimestamp = timestamp;
  }
}

- (void)dealloc {
  [_scheduler stop];
}

@end
