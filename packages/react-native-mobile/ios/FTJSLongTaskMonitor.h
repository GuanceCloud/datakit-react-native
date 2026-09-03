#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef void (^FTJSLongTaskFrameCallback)(CFTimeInterval timestamp);

@protocol FTJSLongTaskQueue <NSObject>
- (BOOL)dispatchBlock:(dispatch_block_t)block;
@end

@protocol FTJSLongTaskFrameScheduler <NSObject>
- (void)start;
- (void)stop;
@end

@protocol FTJSLongTaskFrameSchedulerFactory <NSObject>
- (id<FTJSLongTaskFrameScheduler>)createSchedulerWithCallback:(FTJSLongTaskFrameCallback)callback;
@end

@protocol FTJSLongTaskReporter <NSObject>
- (void)reportLongTaskWithDurationNanoseconds:(int64_t)durationNanoseconds;
@end

@interface FTJSLongTaskMonitor : NSObject

- (instancetype)initWithQueue:(id<FTJSLongTaskQueue>)queue
              schedulerFactory:(id<FTJSLongTaskFrameSchedulerFactory>)schedulerFactory
                       reporter:(id<FTJSLongTaskReporter>)reporter NS_DESIGNATED_INITIALIZER;
- (instancetype)init NS_UNAVAILABLE;

- (void)setThresholdMilliseconds:(double)thresholdMilliseconds;
- (void)start;
- (void)stop;
- (void)stopWithCompletion:(nullable dispatch_block_t)completion;

@end

@class RCTBridge;

@interface FTJSLongTaskMonitor (Production)
+ (instancetype)monitorWithBridge:(RCTBridge *)bridge;
@end

NS_ASSUME_NONNULL_END
