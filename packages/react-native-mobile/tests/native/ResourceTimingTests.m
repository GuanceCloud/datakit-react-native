#import <GuanceSDK/FTExternalDataManager.h>
#import <React/RCTConvert.h>
#import "FTReactNativeResource.h"
#import "FTWebSocketResourceData.h"
#include <assert.h>

// Only platform conversion/reporting dependencies are replaced. Public model
// headers and the timing/duration method bodies come from the installed SDK.
@interface FTResourceMetricsModel (TimingTest)
- (NSNumber *)fetchInterval;
@end
@interface NSDate (TimingTest)
- (NSNumber *)ft_nanosecondTimeIntervalToDate:(NSDate *)date;
@end
@implementation NSDate (TimingTest)
- (NSNumber *)ft_nanosecondTimeIntervalToDate:(NSDate *)date {
  return @([date timeIntervalSinceDate:self] * 1e9);
}
@end
@interface FTRUMResourceDataModel : NSObject
@property (nonatomic, strong) FTResourceMetricsModel *metrics;
@end
@implementation FTRUMResourceDataModel @end
@implementation FTResourceContentModel @end
typedef struct { long long startNs; long long endNs; BOOL valid; } FTRUMResourceTiming;
@interface TimingHandler : NSObject
@property (nonatomic) long long startNs;
@property (nonatomic, strong) NSNumber *stopNs;
@property (nonatomic, strong) NSDate *time;
- (FTRUMResourceTiming)timingForModel:(FTRUMResourceDataModel *)model;
- (NSNumber *)durationForModel:(FTRUMResourceDataModel *)model;
@end
#import "NativeResourceTiming.inc"

static FTResourceMetricsModel *lastMetrics;
static FTResourceContentModel *lastContent;
@implementation FTExternalDataManager
+ (instancetype)sharedManager {
  static FTExternalDataManager *instance;
  if (!instance) instance = [self new];
  return instance;
}
- (void)addResourceWithKey:(NSString *)key metrics:(FTResourceMetricsModel *)metrics content:(FTResourceContentModel *)content {
  lastMetrics = metrics;
  lastContent = content;
}
@end
@implementation RCTConvert
+ (NSNumber *)NSNumber:(id)value { return value; }
+ (NSDictionary *)NSDictionary:(id)value { return value; }
+ (NSString *)NSString:(id)value { return value; }
+ (NSURL *)NSURL:(id)value { return value ? [NSURL URLWithString:value] : nil; }
+ (int)int:(id)value { return [value intValue]; }
+ (NSInteger)NSInteger:(id)value { return [value integerValue]; }
+ (BOOL)BOOL:(id)value { return [value boolValue]; }
@end

static void Collect(NSDictionary *metrics, NSDictionary *metadata, BOOL nativeRoute) {
  NSDictionary *content = @{@"url": @"wss://fixture/socket", @"httpMethod": @"GET", @"webSocketHandshake": @YES};
  if (nativeRoute) {
    NSDictionary *data = FTWebSocketResourceData(content, metrics, metadata, @"open");
    FTAddReactNativeResource(@"key", data[@"content"], data[@"metrics"]);
  } else {
    FTAddReactNativeResource(@"key", content, metrics);
  }
}

int main(void) { @autoreleasepool {
  NSDictionary *captured = @{
    @"duration": @25000001,
    @"fetchStartNsTimeInterval": @"1700000000001000000",
    @"fetchEndNsTimeInterval": @"1700000000026000001"
  };
  TimingHandler *handler = [TimingHandler new];
  FTRUMResourceDataModel *model = [FTRUMResourceDataModel new];
  // Capture is [1 ms, 26.000001 ms]. Native processing may run much later,
  // including start and stop drained at the same time. It must not redefine it.
  long long processing[][2] = {{1, 26}, {11, 100}, {100, 100}, {1000, 2000}};
  int failures = 0;
  for (NSNumber *nativeRoute in @[@NO, @YES]) {
    for (NSNumber *metadataAvailable in @[@NO, @YES]) {
      Collect(captured, metadataAvailable.boolValue ? @{@"httpProtocol": @"HTTP/1.1"} : nil, nativeRoute.boolValue);
      failures += lastMetrics.fetchStartNsTimeInterval != 1700000000001000000LL;
      failures += lastMetrics.fetchEndNsTimeInterval != 1700000000026000001LL;
      assert(lastMetrics.resource_dns == nil && lastMetrics.resource_tcp == nil && lastMetrics.resource_ssl == nil &&
             lastMetrics.resource_ttfb == nil && lastMetrics.resource_trans == nil && lastMetrics.resource_first_byte == nil);
      if (nativeRoute.boolValue && metadataAvailable.boolValue)
        assert([lastMetrics.resourceHttpProtocol isEqual:@"HTTP/1.1"]);
      model.metrics = lastMetrics;
      for (unsigned i = 0; i < sizeof(processing) / sizeof(processing[0]); i++) {
        handler.startNs = 1700000000000000000LL + processing[i][0] * 1000000;
        handler.stopNs = @(1700000000000000000LL + processing[i][1] * 1000000);
        long long actual = [handler durationForModel:model].longLongValue;
        FTRUMResourceTiming interval = [handler timingForModel:model];
        failures += !interval.valid || interval.startNs != 1700000000001000000LL || interval.endNs != 1700000000026000001LL;
        printf("processing=[%lld,%lld]ms expected=25000001ns actual=%lldns\n", processing[i][0], processing[i][1], actual);
        failures += actual != 25000001;
      }
    }
  }
  fflush(stdout);
  assert(failures == 0);
  Collect(@{@"duration": @0, @"fetchStartNsTimeInterval": @"1700000000001000000",
            @"fetchEndNsTimeInterval": @"1700000000001000000"}, nil, YES);
  model.metrics = lastMetrics;
  assert([handler durationForModel:model].longLongValue == 0);
  Collect(@{@"fetchStartNsTimeInterval": @"9223372036854775806",
            @"fetchEndNsTimeInterval": @"9223372036854775807"}, nil, YES);
  model.metrics = lastMetrics;
  assert([handler durationForModel:model].longLongValue == 1);
  for (id invalid in @[@0, NSNull.null, @"", @"0", @"-1", @"1.5", @"1e9", @" 123", @"01", @"9223372036854775808"]) {
    for (NSString *field in @[@"fetchStartNsTimeInterval", @"fetchEndNsTimeInterval"]) {
      NSMutableDictionary *metrics = [captured mutableCopy];
      metrics[field] = invalid;
      Collect(metrics, nil, YES);
      assert(lastMetrics.fetchStartNsTimeInterval == 0 && lastMetrics.fetchEndNsTimeInterval == 0);
    }
  }
  for (NSDictionary *missingOrReversed in @[
    @{}, @{@"duration": @25000001},
    @{@"fetchStartNsTimeInterval": @"1700000000001000000"},
    @{@"fetchEndNsTimeInterval": @"1700000000026000001"},
    @{@"fetchStartNsTimeInterval": @"1700000000026000001", @"fetchEndNsTimeInterval": @"1700000000001000000"}
  ]) {
    Collect(missingOrReversed, nil, YES);
    assert(lastMetrics.fetchStartNsTimeInterval == 0 && lastMetrics.fetchEndNsTimeInterval == 0);
  }
  // Existing public manual HTTP metrics retain their previous mapping.
  FTAddReactNativeResource(@"http", @{@"url": @"https://fixture/"},
                          @{@"duration": @25000000, @"resource_dns": @1200000,
                            @"fetchStartNsTimeInterval": @"1700000000001000000",
                            @"fetchEndNsTimeInterval": @"1700000000026000001"});
  assert(lastMetrics.duration.longLongValue == 25000000 && lastMetrics.resource_dns.longLongValue == 1200000);
  assert(lastMetrics.fetchStartNsTimeInterval == 0 && lastMetrics.fetchEndNsTimeInterval == 0);
  assert(!lastContent.webSocketHandshake);
  puts("PASS: production WebSocket conversion + GuanceSDK 1.6.8 interval/duration selection");
} return 0; }
