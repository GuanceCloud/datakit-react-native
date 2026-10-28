#import <Foundation/Foundation.h>

// Capture-side normalization. Neither dictionary includes invented response
// content, sizes, network phase timings, or native NSError identifiers.
FOUNDATION_EXPORT NSDictionary *FTWebSocketResourceData(NSDictionary *content, NSDictionary *metrics,
                                                       NSDictionary *metadata, NSString *event);

// Exact capture interval from decimal int64 nanosecond strings. Missing or
// invalid endpoints reject the whole pair; processing time is never substituted.
FOUNDATION_EXPORT BOOL FTWebSocketResourceInterval(NSDictionary *metrics, int64_t *start, int64_t *end);

// Same precedence and polarity as the native Resource URL policy: the block
// list wins when both callbacks exist. This decides collection, not business IO.
FOUNDATION_EXPORT BOOL FTWebSocketShouldCollectResource(NSURL *url,
                                                        BOOL (^resourceUrlHandler)(NSURL *),
                                                        BOOL (^intakeUrlHandler)(NSURL *));

// Guance's keyed Trace generation caches correlation until addResource. A
// filtered/cancelled observation has no addResource, so discard that key only.
FOUNDATION_EXPORT BOOL FTWebSocketDiscardTraceResource(id interceptor, NSString *key);
