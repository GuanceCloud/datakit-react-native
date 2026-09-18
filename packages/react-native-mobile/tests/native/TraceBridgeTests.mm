#import "TraceBridgeStubs.h"
#import "FTReactNativeTrace.h"

static NSUInteger checks, singletonReads;
static void Check(BOOL condition) {
  checks++;
  if (!condition) { NSLog(@"Trace bridge assertion %lu failed", (unsigned long)checks); abort(); }
}

@interface FTReactNativeTrace (TestMethods)
- (id)getTraceHeaderFieldsSync:(NSString *)url key:(NSString *)key;
- (void)cancelWebSocketTrace:(NSString *)key resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject;
- (void)invalidate;
@end

@implementation FTExternalDataManager
+ (instancetype)sharedManager {
  singletonReads++;
  static FTExternalDataManager *manager;
  static dispatch_once_t once;
  dispatch_once(&once, ^{ manager = [FTExternalDataManager new]; });
  return manager;
}
- (NSDictionary *)getTraceHeaderWithUrl:(NSURL *)url {
  return [self.resourceDelegate getTraceHeaderWithUrl:url];
}
@end
@implementation FTTraceConfig @end
@implementation FTMobileAgent
+ (instancetype)sharedInstance { Check(NO); return nil; }
- (void)startTraceWithConfigOptions:(__unused FTTraceConfig *)config { Check(NO); }
@end
@implementation RCTConvert
+ (double)double:(id)value { return [value doubleValue]; }
+ (int)int:(id)value { return [value intValue]; }
+ (BOOL)BOOL:(id)value { return [value boolValue]; }
@end

@interface TraceDelegate : NSObject <FTExternalResourceProtocol>
@property (nonatomic, strong) NSMutableDictionary *entries;
@property (nonatomic) BOOL throwAfterGeneration;
@property (nonatomic) BOOL throwOnCancel;
@end
@implementation TraceDelegate
- (instancetype)init {
  if ((self = [super init])) _entries = [NSMutableDictionary new];
  return self;
}
- (NSDictionary *)getTraceHeaderWithKey:(NSString *)key url:(__unused NSURL *)url {
  self.entries[key] = @{@"traceID": @"trace", @"spanID": @"span"};
  if (self.throwAfterGeneration) @throw [NSException exceptionWithName:@"generation" reason:nil userInfo:nil];
  return @{@"traceparent": @"header"};
}
- (NSDictionary *)getTraceHeaderWithUrl:(__unused NSURL *)url { return @{@"traceparent": @"unkeyed"}; }
- (void)removeTraceHandlerWithKey:(NSString *)key {
  if (self.throwOnCancel) @throw [NSException exceptionWithName:@"cancellation" reason:nil userInfo:nil];
  [self.entries removeObjectForKey:key];
}
@end

static void Cancel(FTReactNativeTrace *bridge, NSString *key) {
  NSUInteger reads = singletonReads;
  __block NSUInteger resolutions = 0;
  [bridge cancelWebSocketTrace:key resolve:^(__unused id value) { resolutions++; }
    reject:^(__unused NSString *code, __unused NSString *message, __unused NSError *error) { Check(NO); }];
  Check(resolutions == 1);
  Check(singletonReads == reads); // No singleton recreation, even after shutdown.
}

int main(void) {
  @autoreleasepool {
    FTReactNativeTrace *bridge = [FTReactNativeTrace new];
    FTExternalDataManager *manager = [FTExternalDataManager sharedManager];
    Cancel(bridge, @"not-created");
    TraceDelegate *delegate = [TraceDelegate new];
    manager.resourceDelegate = delegate;
    delegate.entries[@"ordinary-http"] = @"keep";
    Check([[bridge getTraceHeaderFieldsSync:@"wss://fixture" key:@"abandoned"] isEqual:(@{@"traceparent": @"header"})]);
    Check(delegate.entries.count == 2);
    Cancel(bridge, @"abandoned"); // No WebSocket capture or Resource start needed.
    Check([delegate.entries isEqual:(@{@"ordinary-http": @"keep"})]);
    Cancel(bridge, @"abandoned");
    Cancel(bridge, @"");
    Check(delegate.entries.count == 1);

    delegate.throwAfterGeneration = YES;
    @try { [bridge getTraceHeaderFieldsSync:@"wss://fixture" key:@"throws"]; Check(NO); }
    @catch (NSException *exception) { Check([exception.name isEqual:@"generation"]); }
    Check(delegate.entries.count == 2);
    Cancel(bridge, @"throws");
    Check(delegate.entries.count == 1);
    delegate.throwAfterGeneration = NO;
    delegate.throwOnCancel = YES;
    Cancel(bridge, @"ordinary-http"); // SDK cancellation errors cannot escape.
    Check(delegate.entries.count == 1);
    delegate.throwOnCancel = NO;

    [bridge getTraceHeaderFieldsSync:@"wss://fixture" key:@"late"];
    TraceDelegate *replacement = [TraceDelegate new];
    replacement.entries[@"new-lifecycle"] = @"keep";
    manager.resourceDelegate = replacement;
    Cancel(bridge, @"late"); // Use the generation owner, not the current singleton delegate.
    Check(delegate.entries.count == 1);
    Check(replacement.entries.count == 1);
    [bridge getTraceHeaderFieldsSync:@"wss://fixture" key:@"next"];
    Cancel(bridge, @"late");
    Check(replacement.entries.count == 2);
    Cancel(bridge, @"next");
    Check(replacement.entries.count == 1);

    __weak TraceDelegate *weakDelegate;
    @autoreleasepool {
      TraceDelegate *temporary = [TraceDelegate new];
      weakDelegate = temporary;
      manager.resourceDelegate = temporary;
      [bridge getTraceHeaderFieldsSync:@"wss://fixture" key:@"shutdown"];
    }
    Check(weakDelegate == nil); // The bridge cannot retain an old SDK instance.
    Cancel(bridge, @"shutdown");
    Check([bridge getTraceHeaderFieldsSync:@"wss://fixture" key:@"no-sdk"] == nil);
    Cancel(bridge, @"no-sdk");
    manager.resourceDelegate = replacement;
    [bridge getTraceHeaderFieldsSync:@"wss://fixture" key:@"invalidate"];
    [bridge invalidate];
    Cancel(bridge, @"invalidate");
    Check(replacement.entries.count == 2);
    NSLog(@"PASS: %lu Trace bridge assertions", (unsigned long)checks);
  }
}
