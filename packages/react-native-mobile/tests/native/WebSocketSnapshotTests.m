// Production store with controlled SocketRocket response lifetime and queues.
#import <Foundation/Foundation.h>
#import <CFNetwork/CFNetwork.h>
#import <objc/runtime.h>
#import <objc/message.h>
#include <stdatomic.h>
#import "FTWebSocketMetadataStore.h"
#import "FTWebSocketResourceData.h"

#ifdef FT_TEST_LEGACY
static const NSUInteger FTCapturedHeaderReads = 1;
#else
static const NSUInteger FTCapturedHeaderReads = 0;
#endif

#ifdef FT_TEST_MISSING_RESPONSE
#define _HTTPHeadersDidFinish _UnusedHeadersDidFinish
#endif

@interface FTWebSocketMetadataStore (SnapshotTesting)
+ (NSDictionary *)responseSnapshot:(CFHTTPMessageRef)response;
+ (NSTimeInterval)monotonicTime;
+ (void)pruneAtTime:(NSTimeInterval)now;
@end
static _Atomic(double) FTTestTime = 10;
static NSTimeInterval FTClock(__unused id cls, __unused SEL selector) { return atomic_load(&FTTestTime); }
static _Atomic(NSUInteger) FTSnapshotCalls;
static NSDictionary *(*FTOriginalSnapshot)(id, SEL, CFHTTPMessageRef);
static void (^FTBeforeSnapshot)(void);
static NSDictionary *FTSnapshot(__unused id cls, SEL selector, CFHTTPMessageRef response) {
  atomic_fetch_add(&FTSnapshotCalls, 1);
  if (FTBeforeSnapshot) FTBeforeSnapshot();
  return FTOriginalSnapshot(FTWebSocketMetadataStore.class, selector, response);
}

static NSUInteger FTAssertions;
#define Check(value) do { FTAssertions++; if (!(value)) { fprintf(stderr, "FAIL snapshot line %d: %s\n", __LINE__, #value); exit(1); } } while (0)

@interface SRWebSocket : NSObject {
  CFHTTPMessageRef _headers;
}
@property (nonatomic, weak) id delegate;
@property (nonatomic, strong) NSURL *url;
@property (atomic) NSInteger readyState;
@property (nonatomic) NSUInteger headerReads;
@property (nonatomic) NSUInteger originalCalls;
@property (nonatomic) BOOL releaseResponse;
@property (nonatomic) BOOL throwFromOriginal;
@property (nonatomic, copy) void (^onOriginal)(CFHTTPMessageRef);
#ifdef FT_TEST_BAD_GETTER
@property (nonatomic, readonly) id receivedHTTPHeaders;
#else
@property (nonatomic, readonly) CFHTTPMessageRef receivedHTTPHeaders;
#endif
#ifdef FT_TEST_INIT_ARGUMENT
- (instancetype)initWithURLRequest:(NSURLRequest *)request protocols:(NSUInteger)protocols;
#else
- (instancetype)initWithURLRequest:(NSURLRequest *)request protocols:(NSArray *)protocols;
#endif
- (void)receiveResponse:(NSString *)response;
#if defined(FT_TEST_LEGACY)
- (void)_HTTPHeadersDidFinish;
#elif defined(FT_TEST_RESPONSE_ARGUMENT)
- (void)_HTTPHeadersDidFinish:(id)message;
#elif defined(FT_TEST_RESPONSE_RETURN)
- (id)_HTTPHeadersDidFinish:(CFHTTPMessageRef)message;
#else
- (void)_HTTPHeadersDidFinish:(CFHTTPMessageRef)message;
#endif
- (void)finishOriginal:(CFHTTPMessageRef)message;
@end
@implementation SRWebSocket
#ifdef FT_TEST_INIT_ARGUMENT
- (instancetype)initWithURLRequest:(NSURLRequest *)request protocols:(__unused NSUInteger)protocols {
#else
- (instancetype)initWithURLRequest:(NSURLRequest *)request protocols:(__unused NSArray *)protocols {
#endif
  if ((self = [super init])) self.url = request.URL;
  return self;
}
- (void)receiveResponse:(NSString *)response {
  if (_headers) CFRelease(_headers);
  _headers = CFHTTPMessageCreateEmpty(NULL, NO);
  NSData *bytes = [response dataUsingEncoding:NSUTF8StringEncoding];
  CFHTTPMessageAppendBytes(_headers, bytes.bytes, bytes.length);
#ifdef FT_TEST_LEGACY
  [self _HTTPHeadersDidFinish];
#else
  ((void (*)(id, SEL, CFHTTPMessageRef))objc_msgSend)(self, @selector(_HTTPHeadersDidFinish:), _headers);
#endif
}
#if defined(FT_TEST_LEGACY)
- (void)_HTTPHeadersDidFinish { [self finishOriginal:_headers]; }
#elif defined(FT_TEST_RESPONSE_ARGUMENT)
- (void)_HTTPHeadersDidFinish:(id)message { [self finishOriginal:(__bridge CFHTTPMessageRef)message]; }
#elif defined(FT_TEST_RESPONSE_RETURN)
- (id)_HTTPHeadersDidFinish:(CFHTTPMessageRef)message { [self finishOriginal:message]; return nil; }
#else
- (void)_HTTPHeadersDidFinish:(CFHTTPMessageRef)message { [self finishOriginal:message]; }
#endif
- (void)finishOriginal:(CFHTTPMessageRef)message {
  self.originalCalls++;
  if (self.onOriginal) self.onOriginal(message);
  if (self.releaseResponse) { CFRelease(_headers); _headers = NULL; }
  if (self.throwFromOriginal) @throw [NSException exceptionWithName:@"original-response" reason:nil userInfo:nil];
}
#ifdef FT_TEST_BAD_GETTER
- (id)receivedHTTPHeaders { self.headerReads++; return (__bridge id)_headers; }
#else
- (CFHTTPMessageRef)receivedHTTPHeaders { self.headerReads++; return _headers; }
#endif
- (void)dealloc { if (_headers) CFRelease(_headers); }
@end

// No additional ivars: also models an isa change after initialization. A class
// override must not fool the adapter into trusting subclass response semantics.
@interface FTAlternateSocket : SRWebSocket @end
@implementation FTAlternateSocket
- (Class)class { return SRWebSocket.class; }
#ifdef FT_TEST_BAD_GETTER
- (id)receivedHTTPHeaders { self.headerReads++; return nil; }
#else
- (CFHTTPMessageRef)receivedHTTPHeaders { self.headerReads++; return NULL; }
#endif
@end

static NSString *const URL = @"wss://example.test/socket";
static SRWebSocket *Socket(id owner, NSUInteger socketID) {
  SRWebSocket *socket = [[SRWebSocket alloc] initWithURLRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:URL]] protocols:0];
  socket.delegate = owner;
  objc_setAssociatedObject(socket, NSSelectorFromString(@"reactTag"), @(socketID), OBJC_ASSOCIATION_COPY_NONATOMIC);
  return socket;
}
static void Bind(FTWebSocketMetadataStore *store, NSString *key, NSUInteger socketID, double sequence) {
  [store bindResource:key socketID:@(socketID) URL:URL session:@"snapshot" sequence:sequence];
}
static void Wait(dispatch_semaphore_t semaphore) {
  Check(dispatch_semaphore_wait(semaphore, dispatch_time(DISPATCH_TIME_NOW, 5 * NSEC_PER_SEC)) == 0);
}
static void TestFallback(id owner, FTWebSocketMetadataStore *store) {
  __weak SRWebSocket *weakSocket;
  @autoreleasepool {
    SRWebSocket *socket = Socket(owner, 0);
    weakSocket = socket;
    [socket receiveResponse:@"HTTP/1.1 403 Forbidden\r\n\r\n"];
    Check(socket.originalCalls == 1 && socket.headerReads == 0);
  }
  Check(weakSocket == nil);
  __block NSUInteger starts = 0, stops = 0, adds = 0;
  [store startResource:@"basic" socketID:@0 URL:URL session:@"snapshot" sequence:1 report:^{ starts++; }];
  [store stopResource:@"basic" event:@"open" session:@"snapshot" report:^{ stops++; }];
  [store addResource:@"basic" event:@"open" session:@"snapshot" report:^(NSDictionary *metadata, NSString *event) {
    adds++;
    Check(metadata == nil);
    NSDictionary *data = FTWebSocketResourceData(@{@"url": URL}, @{@"duration": @25000000}, metadata, event);
    Check([data[@"content"][@"resourceStatus"] isEqual:@0]);
    Check([data[@"content"][@"webSocketHandshakeState"] isEqual:@"success"]);
    Check([data[@"metrics"][@"duration"] isEqual:@25000000]);
  }];
  Check(starts == 1 && stops == 1 && adds == 1);
  [store startResource:@"filtered" socketID:@1 URL:URL session:@"snapshot" sequence:2 report:^{
    Check(!FTWebSocketShouldCollectResource([NSURL URLWithString:URL], ^BOOL(__unused NSURL *url) { return YES; }, nil));
    [store cancelResource:@"filtered" session:@"snapshot"];
  }];
  [store stopResource:@"filtered" event:@"open" session:@"snapshot" report:^{ Check(NO); }];
  [store addResource:@"filtered" event:@"open" session:@"snapshot" report:^(__unused NSDictionary *metadata, __unused NSString *event) { Check(NO); }];
  Check(atomic_load(&FTSnapshotCalls) == 0);
}

static void TestConcreteSocketClass(void) {
  [FTWebSocketMetadataStore sdkDidStart];
  id owner = [NSObject new];
  FTWebSocketMetadataStore *store = [FTWebSocketMetadataStore new];
  Check([store startForOwner:owner session:@"snapshot"]);
  double sequence = 0;
  for (NSString *scenario in @[@"subclass", @"before-response", @"during-copy", @"after-copy"]) {
    __weak SRWebSocket *weakSocket;
    __block NSUInteger starts = 0, stops = 0, adds = 0;
    NSUInteger before = atomic_load(&FTSnapshotCalls);
    @autoreleasepool {
      SRWebSocket *socket;
      if ([scenario isEqual:@"subclass"]) {
        socket = [[FTAlternateSocket alloc] initWithURLRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:URL]] protocols:0];
        socket.delegate = owner;
        objc_setAssociatedObject(socket, NSSelectorFromString(@"reactTag"), @9, OBJC_ASSOCIATION_COPY_NONATOMIC);
      } else {
        socket = Socket(owner, 9);
      }
      weakSocket = socket;
      [store startResource:scenario socketID:@9 URL:URL session:@"snapshot" sequence:++sequence report:^{ starts++; }];
      if ([scenario isEqual:@"before-response"]) object_setClass(socket, FTAlternateSocket.class);
      if ([scenario isEqual:@"during-copy"]) FTBeforeSnapshot = ^{ object_setClass(socket, FTAlternateSocket.class); };
      [socket receiveResponse:@"HTTP/1.1 403 Forbidden\r\nX-Original: real\r\n\r\n"];
      FTBeforeSnapshot = nil;
      if ([scenario isEqual:@"after-copy"]) object_setClass(socket, FTAlternateSocket.class);
      BOOL copied = [scenario isEqual:@"during-copy"] || [scenario isEqual:@"after-copy"];
      Check(atomic_load(&FTSnapshotCalls) == before + (copied ? 1 : 0));
      Check(socket.headerReads == (copied ? FTCapturedHeaderReads : 0));
      Check(socket.originalCalls == 1);
      [store stopResource:scenario event:@"error" session:@"snapshot" report:^{ stops++; }];
      [store addResource:scenario event:@"error" session:@"snapshot" report:^(NSDictionary *metadata, NSString *event) {
        adds++;
        // A previously completed immutable snapshot stays safe after isa changes.
        BOOL saved = [scenario isEqual:@"after-copy"];
        Check(saved ? [metadata[@"httpStatus"] isEqual:@403] : metadata == nil);
        NSDictionary *data = FTWebSocketResourceData(@{@"url": URL}, @{@"duration": @25000000}, metadata, event);
        Check([data[@"content"][@"resourceStatus"] isEqual:(saved ? @403 : @0)]);
        Check([data[@"content"][@"webSocketHandshakeState"] isEqual:(saved ? @"rejected" : @"failed")]);
        Check([data[@"metrics"][@"duration"] isEqual:@25000000]);
      }];
      Check(starts == 1 && stops == 1 && adds == 1);
    }
    Check(weakSocket == nil);
  }
  // Unsupported objects never disable enrichment for the next standard socket.
  SRWebSocket *standard = Socket(owner, 9);
  Bind(store, @"standard-after-subclass", 9, ++sequence);
  [standard receiveResponse:@"HTTP/1.1 101 OK\r\n\r\n"];
  Check([[store takeResource:@"standard-after-subclass" session:@"snapshot"][@"httpStatus"] isEqual:@101]);
  [FTWebSocketMetadataStore shutDown];
}

int main(int argc, const char *argv[]) {
  @autoreleasepool {
    method_setImplementation(class_getClassMethod(FTWebSocketMetadataStore.class, @selector(monotonicTime)), (IMP)FTClock);
    Method snapshotMethod = class_getClassMethod(FTWebSocketMetadataStore.class, @selector(responseSnapshot:));
    if (snapshotMethod) {
      FTOriginalSnapshot = (void *)method_getImplementation(snapshotMethod);
      method_setImplementation(snapshotMethod, (IMP)FTSnapshot);
    }
    SEL initSelector = @selector(initWithURLRequest:protocols:);
#ifdef FT_TEST_LEGACY
    SEL responseSelector = @selector(_HTTPHeadersDidFinish);
#else
    SEL responseSelector = @selector(_HTTPHeadersDidFinish:);
#endif
    IMP initializer = class_getMethodImplementation(SRWebSocket.class, initSelector);
    IMP responseOriginal = class_getMethodImplementation(SRWebSocket.class, responseSelector);
    NSString *mode = argc > 1 ? @(argv[1]) : @"snapshot";
    id owner = [NSObject new];
    FTWebSocketMetadataStore *store = [FTWebSocketMetadataStore new];
    Check([store startForOwner:owner session:@"snapshot"]);
    if (![mode isEqual:@"snapshot"] && ![mode isEqual:@"legacy"]) {
      Check(class_getMethodImplementation(SRWebSocket.class, initSelector) == initializer);
      Check(class_getMethodImplementation(SRWebSocket.class, responseSelector) == responseOriginal);
      TestFallback(owner, store);
      [FTWebSocketMetadataStore shutDown];
      printf("PASS: %lu fallback assertions (%s)\n", (unsigned long)FTAssertions, mode.UTF8String);
      return 0;
    }
    SRWebSocket *socket = Socket(owner, 0);
    [store bindResource:@"released" socketID:@0 URL:URL session:@"snapshot" sequence:1];
    socket.releaseResponse = YES;
    [socket receiveResponse:@"HTTP/1.1 403 Forbidden\r\nX-Original: real\r\n\r\n"];
    socket.readyState = 3;
    NSDictionary *metadata = [store takeResource:@"released" session:@"snapshot"];
    Check([metadata[@"httpStatus"] isEqual:@403]);
    Check([metadata[@"httpProtocol"] isEqual:@"HTTP/1.1"]);
    Check([metadata[@"responseHeader"][@"X-Original"] isEqual:@"real"]);
    Check(socket.headerReads == FTCapturedHeaderReads);
    Check(socket.originalCalls == 1);
    IMP responseHook = class_getMethodImplementation(SRWebSocket.class, responseSelector);
    Check(responseHook != responseOriginal);
    Check([store startForOwner:owner session:@"snapshot"]);
    Check(class_getMethodImplementation(SRWebSocket.class, responseSelector) == responseHook);

    // The original can replace a response without affecting the captured data;
    // a repeated callback still forwards once but builds no second snapshot.
    socket = Socket(owner, 1);
    Bind(store, @"replaced", 1, 2);
    NSUInteger before = atomic_load(&FTSnapshotCalls);
    [socket receiveResponse:@"HTTP/1.1 403 Forbidden\r\nX-First: first\r\n\r\n"];
    [socket receiveResponse:@"HTTP/1.1 503 Unavailable\r\nX-First: second\r\n\r\n"];
    Check(atomic_load(&FTSnapshotCalls) == before + 1);
    Check(socket.originalCalls == 2);
    metadata = [store takeResource:@"replaced" session:@"snapshot"];
    Check([metadata[@"httpStatus"] isEqual:@403]);
    Check([metadata[@"responseHeader"][@"X-First"] isEqual:@"first"]);
    Check(socket.headerReads == FTCapturedHeaderReads);

    // Snapshot and metadata outlive the socket, including before RN association.
    __weak SRWebSocket *weakSocket;
    @autoreleasepool {
      SRWebSocket *temporary = Socket(owner, 2);
      weakSocket = temporary;
      [temporary receiveResponse:@"HTTP/1.1 101 OK\r\nX-Owned: yes\r\n\r\n"];
      Bind(store, @"response-first", 2, 3);
      metadata = [store takeResource:@"response-first" session:@"snapshot"];
    }
    Check(weakSocket == nil);
    Check([metadata[@"responseHeader"][@"X-Owned"] isEqual:@"yes"]);

    // Byte cap includes UTF-8 field name/value and ': ' plus CRLF (four bytes).
    for (NSNumber *length in @[@16379, @16380]) {
      socket = Socket(owner, 3);
      Bind(store, @"cap", 3, 4 + length.doubleValue);
      NSString *value = [@"x" stringByPaddingToLength:length.unsignedIntegerValue withString:@"x" startingAtIndex:0];
      [socket receiveResponse:[NSString stringWithFormat:@"HTTP/1.1 200 OK\r\nX: %@\r\n\r\n", value]];
      metadata = [store takeResource:@"cap" session:@"snapshot"];
      Check([metadata[@"httpStatus"] isEqual:@200]);
      Check((metadata[@"responseHeader"] != nil) == (length.unsignedIntegerValue == 16379));
    }

    // No main-queue wait or registry lock is held during the original method.
    socket = Socket(owner, 4);
    Bind(store, @"original", 4, 20000);
    socket.onOriginal = ^(CFHTTPMessageRef response) {
      Check(CFHTTPMessageGetResponseStatusCode(response) == 403);
      dispatch_semaphore_t finished = dispatch_semaphore_create(0);
      dispatch_async(dispatch_get_global_queue(QOS_CLASS_DEFAULT, 0), ^{
        [FTWebSocketMetadataStore pruneAtTime:10];
        dispatch_semaphore_signal(finished);
      });
      Wait(finished);
    };
    socket.throwFromOriginal = YES;
    @try { [socket receiveResponse:@"HTTP/1.1 403 Forbidden\r\n\r\n"]; Check(NO); }
    @catch (NSException *exception) { Check([exception.name isEqual:@"original-response"]); }
    Check(socket.originalCalls == 1);
    Check([[store takeResource:@"original" session:@"snapshot"][@"httpStatus"] isEqual:@403]);

    // An instrumentation exception cannot prevent original processing.
    socket = Socket(owner, 5);
    Bind(store, @"instrumentation-error", 5, 20001);
    FTBeforeSnapshot = ^{ @throw [NSException exceptionWithName:@"snapshot-error" reason:nil userInfo:nil]; };
    [socket receiveResponse:@"HTTP/1.1 101 OK\r\n\r\n"];
    FTBeforeSnapshot = nil;
    Check(socket.originalCalls == 1);
    Check([store takeResource:@"instrumentation-error" session:@"snapshot"] == nil);

    // Pause on the SR queue while main performs each cleanup. Time is controlled;
    // semaphore deadlines only prevent a deadlock from hanging the test process.
    for (NSString *cleanup in @[@"stop", @"cancel", @"expire", @"shutdown", @"invalidate", @"reuse"]) {
      [store clear];
      [FTWebSocketMetadataStore sdkDidStart];
      atomic_store(&FTTestTime, 100);
      store = [FTWebSocketMetadataStore new];
      Check([store startForOwner:owner session:@"snapshot"]);
      socket = Socket(owner, 6);
      Bind(store, @"race", 6, 1);
      dispatch_semaphore_t entered = dispatch_semaphore_create(0);
      dispatch_semaphore_t proceed = dispatch_semaphore_create(0);
      dispatch_semaphore_t finished = dispatch_semaphore_create(0);
      FTBeforeSnapshot = ^{
        dispatch_semaphore_signal(entered);
        if (dispatch_semaphore_wait(proceed, dispatch_time(DISPATCH_TIME_NOW, 5 * NSEC_PER_SEC))) abort();
      };
      dispatch_async(dispatch_get_global_queue(QOS_CLASS_DEFAULT, 0), ^{
        @autoreleasepool { [socket receiveResponse:@"HTTP/1.1 403 Forbidden\r\n\r\n"]; }
        dispatch_semaphore_signal(finished);
      });
      Wait(entered);
      if ([cleanup isEqual:@"stop"]) [store stopResource:@"race" event:@"close" session:@"snapshot" report:^{}];
      if ([cleanup isEqual:@"cancel"] || [cleanup isEqual:@"reuse"]) [store cancelResource:@"race" session:@"snapshot"];
      if ([cleanup isEqual:@"expire"]) { atomic_store(&FTTestTime, 160); [FTWebSocketMetadataStore pruneAtTime:160]; }
      if ([cleanup isEqual:@"shutdown"]) [FTWebSocketMetadataStore shutDown];
      if ([cleanup isEqual:@"invalidate"]) [store clear];
      SRWebSocket *replacement;
      if ([cleanup isEqual:@"reuse"]) { replacement = Socket(owner, 6); Bind(store, @"replacement", 6, 2); }
      dispatch_semaphore_signal(proceed);
      Wait(finished);
      FTBeforeSnapshot = nil;
      Check(socket.originalCalls == 1 && socket.headerReads == FTCapturedHeaderReads);
      Check([store takeResource:@"race" session:@"snapshot"] == nil);
      if (replacement) {
        [replacement receiveResponse:@"HTTP/1.1 503 Unavailable\r\n\r\n"];
        Check([[store takeResource:@"replacement" session:@"snapshot"][@"httpStatus"] isEqual:@503]);
      }
    }

    // Retired but bound capture sessions may finish; new sockets are transparent.
    [store clear];
    [FTWebSocketMetadataStore sdkDidStart];
    store = [FTWebSocketMetadataStore new];
    Check([store startForOwner:owner session:@"snapshot"]);
    socket = Socket(owner, 7);
    Bind(store, @"retired", 7, 1);
    [store stopForSession:@"snapshot"];
    before = atomic_load(&FTSnapshotCalls);
    [socket receiveResponse:@"HTTP/1.1 101 OK\r\n\r\n"];
    Check([[store takeResource:@"retired" session:@"snapshot"][@"httpStatus"] isEqual:@101]);
    Check(atomic_load(&FTSnapshotCalls) == before + 1);
    [FTWebSocketMetadataStore shutDown];
    before = atomic_load(&FTSnapshotCalls);
    @autoreleasepool {
      SRWebSocket *disabled = Socket(owner, 8);
      weakSocket = disabled;
      [disabled receiveResponse:@"HTTP/1.1 101 OK\r\n\r\n"];
      Check(disabled.originalCalls == 1 && disabled.headerReads == 0);
    }
    Check(weakSocket == nil);
    Check(atomic_load(&FTSnapshotCalls) == before);
    TestConcreteSocketClass();
    printf("PASS: %lu snapshot assertions\n", (unsigned long)FTAssertions);
  }
  return 0;
}
