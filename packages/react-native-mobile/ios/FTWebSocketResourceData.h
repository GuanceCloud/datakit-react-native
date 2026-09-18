#import <Foundation/Foundation.h>

// Capture-side normalization. Neither dictionary includes invented response
// content, sizes, network phase timings, or native NSError identifiers.
FOUNDATION_EXPORT NSDictionary *FTWebSocketResourceData(NSDictionary *content, NSDictionary *metrics,
                                                       NSDictionary *metadata, NSString *event);

// Same precedence and polarity as the native Resource URL policy: the block
// list wins when both callbacks exist. This decides collection, not business IO.
FOUNDATION_EXPORT BOOL FTWebSocketShouldCollectResource(NSURL *url,
                                                        BOOL (^resourceUrlHandler)(NSURL *),
                                                        BOOL (^intakeUrlHandler)(NSURL *));

// Guance's keyed Trace generation caches correlation until addResource. A
// filtered/cancelled observation has no addResource, so discard that key only.
FOUNDATION_EXPORT BOOL FTWebSocketDiscardTraceResource(id interceptor, NSString *key);
