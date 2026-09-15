#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef void (^FTJSLongTaskFrameCallback)(CFTimeInterval timestamp);

@protocol FTJSLongTaskQueue <NSObject>
- (BOOL)dispatchBlock:(dispatch_block_t)block;
@end

@protocol FTJSLongTaskFrameScheduler <NSObject>
// The monitor serializes start/stop; start runs on the JS thread, while stop
// must release resources synchronously even when that thread is unavailable.
- (void)start;
- (void)stop;
@end

@protocol FTJSLongTaskFrameSchedulerFactory <NSObject>
- (id<FTJSLongTaskFrameScheduler>)createSchedulerWithCallback:(FTJSLongTaskFrameCallback)callback;
@end

@protocol FTJSLongTaskReporter <NSObject>
- (void)reportLongTaskWithDurationNanoseconds:(int64_t)durationNanoseconds property:(NSDictionary *)property;
@end

@interface FTJSLongTaskMonitor : NSObject

- (instancetype)initWithQueue:(id<FTJSLongTaskQueue>)queue
              schedulerFactory:(id<FTJSLongTaskFrameSchedulerFactory>)schedulerFactory
                       reporter:(id<FTJSLongTaskReporter>)reporter NS_DESIGNATED_INITIALIZER;
- (instancetype)init NS_UNAVAILABLE;

- (void)setThresholdMilliseconds:(double)thresholdMilliseconds;
// Replaces the snapshot for future detections; does not change monitor lifecycle.
- (void)setBridgeContext:(NSDictionary *)context;
- (void)start;
- (void)stop;
// Completion runs on the calling thread after resources have been released.
- (void)stopWithCompletion:(nullable dispatch_block_t)completion;
// Prevents automatic restarts until a nonzero threshold is configured again.
- (void)disableWithCompletion:(nullable dispatch_block_t)completion;

@end

@class RCTBridge;

@interface FTJSLongTaskMonitor (Production)
+ (instancetype)monitorWithBridge:(RCTBridge *)bridge;
@end

NS_ASSUME_NONNULL_END
