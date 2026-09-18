// Included by the native harness so these tests share its controlled clock,
// SocketRocket double, and assertion counter. Production normalization is used.
#import "FTWebSocketResourceData.h"

@interface FTTraceCacheDouble : NSObject
@property (nonatomic, strong) NSMutableDictionary *entries;
@end
@implementation FTTraceCacheDouble
- (void)removeTraceHandlerWithKey:(id)key { [self.entries removeObjectForKey:key]; }
@end
@interface FTIncompatibleTraceDouble : NSObject @end
@implementation FTIncompatibleTraceDouble
- (NSInteger)removeTraceHandlerWithKey:(__unused id)key { Check(NO); return 1; }
@end
@interface FTThrowingTraceDouble : NSObject @end
@implementation FTThrowingTraceDouble
- (void)removeTraceHandlerWithKey:(__unused id)key {
  @throw [NSException exceptionWithName:@"trace cleanup" reason:nil userInfo:nil];
}
@end

static NSDictionary *ResourceData(NSString *event, NSString *message, NSDictionary *metadata) {
  NSMutableDictionary *content = [@{@"url": URL, @"httpMethod": @"GET", @"requestHeader": @{},
    @"resourceStatus": @999, @"responseBody": @"must not copy", @"errorCode": @2132} mutableCopy];
  if (message) content[@"errorMessage"] = message;
  return FTWebSocketResourceData(content, @{@"duration": @25000000, @"resource_dns": @123}, metadata, event);
}

static void TestNativeResourceReporting(void) {
  [FTWebSocketMetadataStore sdkDidStart];
  atomic_store(&FTTestTime, 1000);
  // A missing RN module only disables enrichment, never native Resource policy.
  FTWebSocketMetadataStore *basic = [FTWebSocketMetadataStore new];
  Check([basic startForOwner:nil session:@"basic"]);
  __block NSUInteger basicStarts = 0, basicStops = 0, basicAdds = 0, policyCalls = 0;
  for (NSString *key in @[@"allowed", @"blocked"]) {
    [basic startResource:key socketID:@0 URL:URL session:@"basic" sequence:++policyCalls report:^{
      if ([key isEqual:@"blocked"]) {
        Check(!FTWebSocketShouldCollectResource([NSURL URLWithString:URL], ^BOOL(__unused NSURL *url) { return YES; }, nil));
        [basic cancelResource:key session:@"basic"];
      } else {
        basicStarts++;
      }
    }];
    [basic stopResource:key event:@"open" session:@"basic" report:^{ basicStops++; }];
    [basic addResource:key event:@"open" session:@"basic" report:^(NSDictionary *metadata, NSString *event) {
      Check(metadata == nil);
      Check([ResourceData(event, nil, metadata)[@"content"][@"resourceStatus"] isEqual:@0]);
      basicAdds++;
    }];
  }
  Check(basicStarts == 1 && basicStops == 1 && basicAdds == 1);
  [FTWebSocketMetadataStore pruneAtTime:1001];
  [basic addResource:@"blocked" event:@"open" session:@"basic" report:^(__unused NSDictionary *metadata, __unused NSString *event) { Check(NO); }];
  [basic startResource:@"pending" socketID:@0 URL:URL session:@"basic" sequence:3 report:^{ basicStarts++; }];
  [basic stopForSession:@"basic"];
  [basic startResource:@"disabled" socketID:@0 URL:URL session:@"basic" sequence:4 report:^{ Check(NO); }];
  [basic stopResource:@"pending" event:@"open" session:@"basic" report:^{ basicStops++; }];
  [basic addResource:@"pending" event:@"open" session:@"basic" report:^(__unused NSDictionary *metadata, __unused NSString *event) { basicAdds++; }];
  Check(basicStarts == 2 && basicStops == 2 && basicAdds == 2);
  [basic clear];
  Check(![basic startForOwner:nil session:@"basic"]);
  [basic addResource:@"late" event:@"open" session:@"basic" report:^(__unused NSDictionary *metadata, __unused NSString *event) { Check(NO); }];
  id owner = [NSObject new];
  FTWebSocketMetadataStore *store = Store(owner, @"reporting");
  FTTraceCacheDouble *traceCache = [FTTraceCacheDouble new];
  traceCache.entries = [@{@"keep": @"ordinary HTTP", @"filtered": @"WebSocket"} mutableCopy];
  Check(FTWebSocketDiscardTraceResource(traceCache, @"filtered"));
  Check([traceCache.entries isEqual:(@{@"keep": @"ordinary HTTP"})]);
  Check(FTWebSocketDiscardTraceResource(traceCache, @"filtered"));
  Check(!FTWebSocketDiscardTraceResource([NSObject new], @"keep"));
  Check(!FTWebSocketDiscardTraceResource([FTIncompatibleTraceDouble new], @"keep"));
  Check(!FTWebSocketDiscardTraceResource([FTThrowingTraceDouble new], @"keep"));
  Check(!FTWebSocketDiscardTraceResource(traceCache, @""));
  Check(traceCache.entries.count == 1);
  NSURL *allowedURL = [NSURL URLWithString:@"wss://fixture/success"];
  NSURL *blockedURL = [NSURL URLWithString:@"wss://fixture/private"];
  BOOL (^blockPrivate)(NSURL *) = ^BOOL(NSURL *url) { return [url.path isEqual:@"/private"]; };
  BOOL (^allowPublic)(NSURL *) = ^BOOL(NSURL *url) { return [url.path isEqual:@"/success"]; };
  Check(FTWebSocketShouldCollectResource(allowedURL, nil, nil));
  Check(FTWebSocketShouldCollectResource(nil, nil, nil));
  Check(!FTWebSocketShouldCollectResource(nil, blockPrivate, nil));
  Check(!FTWebSocketShouldCollectResource(nil, nil, allowPublic));
  Check(FTWebSocketShouldCollectResource(allowedURL, blockPrivate, nil));
  Check(!FTWebSocketShouldCollectResource(blockedURL, blockPrivate, nil));
  Check(FTWebSocketShouldCollectResource(allowedURL, nil, allowPublic));
  Check(!FTWebSocketShouldCollectResource(blockedURL, nil, allowPublic));
  Check(FTWebSocketShouldCollectResource(allowedURL, blockPrivate, ^BOOL(__unused NSURL *url) {
    Check(NO); // Native block-list precedence: never consult the allow-list.
    return NO;
  }));
  Check(!FTWebSocketShouldCollectResource(blockedURL, blockPrivate, ^BOOL(__unused NSURL *url) {
    Check(NO);
    return YES;
  }));
  // Independent contract examples: a response that did not upgrade is rejected;
  // a 101 followed by a protocol failure remains failed. Open always wins.
  for (NSArray *scenario in @[
    @[@0, @"rejected"], @[@100, @"rejected"], @[@101, @"failed"], @[@200, @"rejected"],
    @[@204, @"rejected"], @[@301, @"rejected"], @[@302, @"rejected"],
    @[@304, @"rejected"], @[@399, @"rejected"], @[@400, @"rejected"],
    @[@403, @"rejected"], @[@503, @"rejected"], @[@599, @"rejected"],
    @[@600, @"rejected"], @[@999, @"rejected"]]) {
    NSNumber *code = scenario[0];
    NSDictionary *metadata = @{@"httpStatus": code, @"httpProtocol": @"HTTP/1.1", @"responseHeader": @{@"Upgrade": @"websocket"}};
    NSDictionary *data = ResourceData(@"error", @"Received bad response code from server: 429.", metadata);
    Check([data[@"content"][@"resourceStatus"] isEqual:code]);
    Check([data[@"content"][@"webSocketHandshakeState"] isEqual:scenario[1]]);
    Check([data[@"metrics"] isEqual:(@{@"duration": @25000000, @"resource_http_protocol": @"HTTP/1.1"})]);
    Check([data[@"content"][@"responseHeader"] isEqual:metadata[@"responseHeader"]]);
    Check(data[@"content"][@"responseBody"] == nil && data[@"content"][@"errorCode"] == nil);
    data = ResourceData(@"close", nil, metadata);
    Check([data[@"content"][@"webSocketHandshakeState"] isEqual:scenario[1]]);
    Check([data[@"content"][@"resourceStatus"] isEqual:code]);
    Check(data[@"content"][@"errorMessage"] == nil);
    data = ResourceData(@"open", @"late error", metadata);
    Check([data[@"content"][@"webSocketHandshakeState"] isEqual:@"success"]);
    Check(data[@"content"][@"errorMessage"] == nil);
    Check([data[@"content"][@"resourceStatus"] isEqual:code]);
  }
  NSDictionary *unknown = ResourceData(@"open", @"Received bad response code from server: 200.", nil);
  Check([unknown[@"content"][@"resourceStatus"] isEqual:@0]);
  Check([unknown[@"content"][@"webSocketHandshakeState"] isEqual:@"success"]);
  Check(unknown[@"content"][@"errorMessage"] == nil);
  Check(unknown[@"content"][@"responseHeader"] == nil);
  Check([unknown[@"metrics"] isEqual:(@{@"duration": @25000000})]);
  for (NSArray *scenario in @[
    @[@"Received bad response code from server: 100.", @100, @"rejected"],
    @[@"Received bad response code from server: 200.", @200, @"rejected"],
    @[@"Received bad response code from server: 204.", @204, @"rejected"],
    @[@"Received bad response code from server: 403.", @403, @"rejected"],
    @[@"Received bad response code from server: 503", @503, @"rejected"],
    @[@"  received BAD response code from server : 429.\n", @429, @"rejected"],
    @[@"Received bad response code from server: 302.", @302, @"rejected"],
    @[@"Received bad response code from server: 304.", @304, @"rejected"],
    @[@"Received bad response code from server: 101.", @101, @"failed"],
    @[@"Received bad response code from proxy: 403.", @0, @"failed"],
    @[@"Proxy: Received bad response code from server: 403.", @0, @"failed"],
    @[@"Received bad response code from server: 403. Extra", @0, @"failed"],
    @[@"Received bad response code from server: 600.", @600, @"rejected"],
    @[@"Received bad response code from server: 999.", @999, @"rejected"],
    @[@"Received bad response code from server: 1000.", @0, @"failed"],
    @[@"Received bad response code from server: 0403.", @0, @"failed"],
    @[@"NSError -1009; HTTP status 403", @0, @"failed"],
    @[@"", @0, @"failed"]]) {
    NSDictionary *data = ResourceData(@"error", scenario[0], nil);
    Check([data[@"content"][@"resourceStatus"] isEqual:scenario[1]]);
    Check([data[@"content"][@"webSocketHandshakeState"] isEqual:scenario[2]]);
  }
  // A real response must survive the capture layer too, even outside 100–599.
  @autoreleasepool {
    SRWebSocket *socket = Socket(owner, 88, URL);
    socket.readyState = 3;
    [socket setResponse:@"HTTP/1.1 600 Custom Response\r\nX-Test: real\r\n\r\n"];
    Bind(store, @"nonstandard-status", 88, @"reporting", 1);
    NSDictionary *metadata = [store takeResource:@"nonstandard-status" session:@"reporting"];
    Check([metadata[@"httpStatus"] isEqual:@600]);
    Check([ResourceData(@"error", nil, metadata)[@"content"][@"webSocketHandshakeState"] isEqual:@"rejected"]);
  }
  for (NSString *event in @[@"error", @"close"]) {
    NSDictionary *data = ResourceData(event, nil, nil);
    Check([data[@"content"][@"resourceStatus"] isEqual:@0]);
    Check([data[@"content"][@"webSocketHandshakeState"] isEqual:@"failed"]);
  }
  NSString *longMessage = [@"Received bad response code from server: 403." stringByPaddingToLength:513 withString:@" " startingAtIndex:0];
  Check([ResourceData(@"error", longMessage, nil)[@"content"][@"resourceStatus"] isEqual:@0]);

  // Constructor-first and registration-first both release the business socket
  // at stop, retain only immutable response fields, and emit exactly once.
  __block NSUInteger starts = 0, stops = 0, adds = 0;
  double sequence = 1; // The response capture check above already used 1.
  for (NSNumber *initFirst in @[@YES, @NO]) {
    NSString *key = initFirst.boolValue ? @"init-first" : @"start-first";
    __weak SRWebSocket *weakSocket;
    @autoreleasepool {
      SRWebSocket *socket;
      if (initFirst.boolValue) socket = Socket(owner, 7, URL);
      [store startResource:key socketID:@7 URL:URL session:@"reporting" sequence:++sequence report:^{ starts++; }];
      if (!socket) socket = Socket(owner, 7, URL);
      socket.readyState = 3;
      [socket setResponse:@"HTTP/1.1 403 Forbidden\r\nX-Test: value\r\n\r\n"];
      weakSocket = socket;
    }
    Check(weakSocket != nil);
    [store stopResource:key event:@"error" session:@"reporting" report:^{ stops++; }];
    Check(weakSocket == nil);
    [store stopResource:key event:@"open" session:@"reporting" report:^{ stops++; }];
    [store addResource:key event:@"open" session:@"reporting" report:^(NSDictionary *metadata, NSString *event) {
      adds++;
      Check([event isEqual:@"error"]);
      Check([metadata[@"httpStatus"] isEqual:@403]);
      Check([ResourceData(event, @"Received bad response code from server: 503.", metadata)[@"content"][@"resourceStatus"] isEqual:@403]);
    }];
    [store addResource:key event:@"open" session:@"reporting" report:^(__unused NSDictionary *metadata, __unused NSString *event) { adds++; }];
    Check([[[store valueForKey:@"terminals"][key] valueForKey:@"metadata"] count] == 0);
  }
  Check(starts == 2 && stops == 2 && adds == 2);

  // Missing IDs, expired references, and expired snapshots still finish using
  // basic data; none can recreate an association or invent HTTP 101.
  [store startResource:@"unknown-id" socketID:@(-1) URL:URL session:@"reporting" sequence:++sequence report:^{ starts++; }];
  [store stopResource:@"unknown-id" event:@"open" session:@"reporting" report:^{ stops++; }];
  [store addResource:@"unknown-id" event:@"open" session:@"reporting" report:^(NSDictionary *metadata, NSString *event) {
    Check(metadata == nil);
    Check([ResourceData(event, nil, metadata)[@"content"][@"resourceStatus"] isEqual:@0]);
  }];
  __weak SRWebSocket *expired;
  @autoreleasepool {
    expired = Socket(owner, 8, URL);
    [store startResource:@"expired" socketID:@8 URL:URL session:@"reporting" sequence:++sequence report:^{}];
  }
  atomic_store(&FTTestTime, 1060);
  [FTWebSocketMetadataStore pruneAtTime:1060];
  Check(expired == nil);
  [store stopResource:@"expired" event:@"error" session:@"reporting" report:^{}];
  atomic_store(&FTTestTime, 1120);
  [FTWebSocketMetadataStore pruneAtTime:1120];
  Check([[store valueForKey:@"terminals"] count] == 0);
  [store addResource:@"expired" event:@"error" session:@"reporting" report:^(NSDictionary *metadata, NSString *event) {
    Check(metadata == nil);
    Check([ResourceData(event, @"Received bad response code from server: 503.", metadata)[@"content"][@"webSocketHandshakeState"] isEqual:@"rejected"]);
  }];

  // Native start failure cancels ownership and suppresses delayed stop/add.
  __weak SRWebSocket *failed;
  @autoreleasepool {
    failed = Socket(owner, 9, URL);
    @try {
      [store startResource:@"start-failed" socketID:@9 URL:URL session:@"reporting" sequence:++sequence report:^{
        @throw [NSException exceptionWithName:@"SDK start failure" reason:nil userInfo:nil];
      }];
    } @catch (__unused NSException *exception) {}
  }
  Check(failed == nil);
  [store stopResource:@"start-failed" event:@"open" session:@"reporting" report:^{ Check(NO); }];
  [store addResource:@"start-failed" event:@"open" session:@"reporting" report:^(__unused NSDictionary *metadata, __unused NSString *event) { Check(NO); }];

  // Filtering at start releases ownership immediately and suppresses already
  // queued terminals. It must work whether construction or registration wins.
  for (NSNumber *initFirst in @[@YES, @NO]) {
    NSString *key = initFirst.boolValue ? @"filtered-init-first" : @"filtered-start-first";
    __weak SRWebSocket *filtered;
    @autoreleasepool {
      SRWebSocket *socket;
      if (initFirst.boolValue) socket = Socket(owner, 99, URL);
      [store startResource:key socketID:@99 URL:URL session:@"reporting" sequence:++sequence report:^{
        Check(!FTWebSocketShouldCollectResource(blockedURL, blockPrivate, nil));
        [store cancelResource:key session:@"reporting"];
      }];
      if (!socket) socket = Socket(owner, 99, URL);
      filtered = socket;
    }
    // A constructor arriving after cancellation can remain a bounded temporary
    // candidate, but it must not rebind to the cancelled Resource.
    Check([store valueForKey:@"bindings"][key] == nil);
    if (initFirst.boolValue) Check(filtered == nil);
    [store stopResource:key event:@"open" session:@"reporting" report:^{ Check(NO); }];
    [store addResource:key event:@"open" session:@"reporting" report:^(__unused NSDictionary *metadata, __unused NSString *event) { Check(NO); }];
    [FTWebSocketMetadataStore pruneAtTime:1125];
    Check(filtered == nil);
  }

  for (NSUInteger index = 0; index < 257; index++) {
    atomic_store(&FTTestTime, 1200 + index * 0.01);
    NSString *key = [NSString stringWithFormat:@"bounded-%lu", (unsigned long)index];
    [store stopResource:key event:@"open" session:@"reporting" report:^{}];
  }
  Check([[store valueForKey:@"terminals"] count] == 256);
  Check([store valueForKey:@"terminals"][@"bounded-0"] == nil);
  atomic_store(&FTTestTime, 1300);
  [FTWebSocketMetadataStore pruneAtTime:1300];
  Check([[store valueForKey:@"terminals"] count] == 0);

  // Separate RN owners with the same socket ID and URL never exchange status.
  id otherOwner = [NSObject new];
  FTWebSocketMetadataStore *otherStore = Store(otherOwner, @"other-reporting");
  @autoreleasepool {
    SRWebSocket *first = Socket(owner, 0, URL);
    SRWebSocket *second = Socket(otherOwner, 0, URL);
    first.readyState = second.readyState = 3;
    [first setResponse:@"HTTP/1.1 403 Forbidden\r\n\r\n"];
    [second setResponse:@"HTTP/1.1 503 Unavailable\r\n\r\n"];
    [store startResource:@"isolated" socketID:@0 URL:URL session:@"reporting" sequence:++sequence report:^{}];
    [otherStore startResource:@"isolated" socketID:@0 URL:URL session:@"other-reporting" sequence:1 report:^{}];
  }
  [store stopResource:@"isolated" event:@"error" session:@"reporting" report:^{}];
  [otherStore stopResource:@"isolated" event:@"error" session:@"other-reporting" report:^{}];
  [store addResource:@"isolated" event:@"error" session:@"reporting" report:^(NSDictionary *metadata, __unused NSString *event) { Check([metadata[@"httpStatus"] isEqual:@403]); }];
  [otherStore addResource:@"isolated" event:@"error" session:@"other-reporting" report:^(NSDictionary *metadata, __unused NSString *event) { Check([metadata[@"httpStatus"] isEqual:@503]); }];
  for (NSUInteger index = 0; index < 200; index++) {
    NSString *key = [NSString stringWithFormat:@"global-cap-%lu", (unsigned long)index];
    [store stopResource:key event:@"open" session:@"reporting" report:^{}];
    [otherStore stopResource:key event:@"open" session:@"other-reporting" report:^{}];
  }
  Check([[store valueForKey:@"terminals"] count] + [[otherStore valueForKey:@"terminals"] count] == 256);
  [otherStore clear];

  [store startResource:@"disable" socketID:@(-1) URL:URL session:@"reporting" sequence:++sequence report:^{}];
  [store stopForSession:@"reporting"];
  [store startResource:@"disabled-start" socketID:@(-1) URL:URL session:@"reporting" sequence:++sequence report:^{ Check(NO); }];
  [store stopResource:@"disable" event:@"open" session:@"reporting" report:^{ stops++; }];
  [store addResource:@"disable" event:@"close" session:@"reporting" report:^(__unused NSDictionary *metadata, NSString *event) { Check([event isEqual:@"open"]); }];
  [FTWebSocketMetadataStore shutDown];
  Check([[store valueForKey:@"terminals"] count] == 0);
  Check(![store cancelResource:@"late" session:@"reporting"]);
  [store addResource:@"late" event:@"open" session:@"reporting" report:^(__unused NSDictionary *metadata, __unused NSString *event) { Check(NO); }];
  [FTWebSocketMetadataStore sdkDidStart];
  Check([store startForOwner:owner session:@"next-reporting"]);
  [store stopResource:@"late" event:@"open" session:@"reporting" report:^{ Check(NO); }];
  [store clear];
  Check(![store cancelResource:@"late" session:@"next-reporting"]);
  [store startResource:@"late" socketID:@(-1) URL:URL session:@"next-reporting" sequence:1 report:^{ Check(NO); }];
  [FTWebSocketMetadataStore shutDown];
}
