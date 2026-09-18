#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// Bounded handshake-only ownership. Hooks initialization and HTTP response
/// completion; JS alone controls Resource lifecycle. No delegate events hooked.
@interface FTWebSocketMetadataStore : NSObject
// An unavailable RN owner disables enrichment only; Resource reporting remains valid.
- (BOOL)startForOwner:(nullable id)owner session:(NSString *)session;
- (void)stopForSession:(NSString *)session;
- (void)clear;
- (void)bindResource:(NSString *)key socketID:(NSNumber *)socketID URL:(NSString *)URL session:(NSString *)session sequence:(double)sequence;
- (void)releaseResource:(NSString *)key session:(NSString *)session;
- (nullable NSDictionary *)takeResource:(NSString *)key session:(NSString *)session;
// All callbacks run synchronously under the lifecycle lock on the module's
// main queue. No callback, bridge promise, or business socket is stored here.
- (void)startResource:(NSString *)key socketID:(NSNumber *)socketID URL:(NSString *)URL session:(NSString *)session sequence:(double)sequence report:(void (^)(void))report;
- (void)stopResource:(NSString *)key event:(NSString *)event session:(NSString *)session report:(void (^)(void))report;
- (void)addResource:(NSString *)key event:(NSString *)event session:(NSString *)session report:(void (^)(NSDictionary * _Nullable metadata, NSString *event))report;
- (BOOL)cancelResource:(NSString *)key session:(NSString *)session;
+ (void)sdkDidStart;
+ (void)shutDown;
@end

NS_ASSUME_NONNULL_END
