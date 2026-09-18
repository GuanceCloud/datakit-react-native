// Standalone Foundation/CFNetwork regression harness. Uses the production
// registry with an SR-compatible test double; this is not a transport test.
#import <Foundation/Foundation.h>
#import <CFNetwork/CFNetwork.h>
#import <objc/runtime.h>
#import <stdatomic.h>
#import "FTWebSocketMetadataStore.h"

@interface FTWebSocketMetadataStore (TestClock)
+ (void)pruneAtTime:(NSTimeInterval)now;
+ (void)associateCandidates;
@end

static _Atomic(double) FTTestTime = 10;
static NSTimeInterval FTTestClock(__unused id cls, __unused SEL selector) { return atomic_load(&FTTestTime); }
static NSUInteger FTAssertions, FTInitializations, FTDeallocations;
#define Check(value) do { FTAssertions++; if (!(value)) { fprintf(stderr, "FAIL line %d: %s\n", __LINE__, #value); exit(1); } } while (0)

@interface SRWebSocket : NSObject {
  CFHTTPMessageRef _headers;
}
@property (nonatomic, weak) id delegate;
@property (nonatomic, strong) NSURL *url;
@property (atomic) NSInteger readyState;
@property (nonatomic) NSUInteger headerReads;
@property (nonatomic, readonly) CFHTTPMessageRef receivedHTTPHeaders;
- (instancetype)initWithURLRequest:(NSURLRequest *)request protocols:(NSArray *)protocols;
- (void)setResponse:(NSString *)response;
- (void)open;
- (void)_HTTPHeadersDidFinish:(CFHTTPMessageRef)response;
- (void)_failWithError:(NSError *)error;
@end
@implementation SRWebSocket
- (instancetype)initWithURLRequest:(NSURLRequest *)request protocols:(__unused NSArray *)protocols {
  if ((self = [super init])) {
    FTInitializations++;
    self.url = request.URL;
    if ([request.URL.path isEqual:@"/nil"]) return nil;
    if ([request.URL.path isEqual:@"/throw"]) @throw [NSException exceptionWithName:@"original-init" reason:@"test" userInfo:nil];
  }
  return self;
}
- (void)setResponse:(NSString *)response {
  if (_headers) CFRelease(_headers);
  _headers = CFHTTPMessageCreateEmpty(NULL, NO);
  NSData *data = [response dataUsingEncoding:NSUTF8StringEncoding];
  CFHTTPMessageAppendBytes(_headers, data.bytes, data.length);
  if (CFHTTPMessageIsHeaderComplete(_headers)) [self _HTTPHeadersDidFinish:_headers];
}
- (CFHTTPMessageRef)receivedHTTPHeaders { self.headerReads++; return _headers; }
- (void)open {}
- (void)_HTTPHeadersDidFinish:(__unused CFHTTPMessageRef)response {}
- (void)_failWithError:(__unused NSError *)error {}
- (void)dealloc { FTDeallocations++; if (_headers) CFRelease(_headers); }
@end
@interface DerivedSocket : SRWebSocket @end
@implementation DerivedSocket @end

static SRWebSocket *Socket(id owner, NSUInteger socketID, NSString *URL) {
  SRWebSocket *socket = [[SRWebSocket alloc] initWithURLRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:URL]] protocols:nil];
  socket.delegate = owner;
  objc_setAssociatedObject(socket, NSSelectorFromString(@"reactTag"), @(socketID), OBJC_ASSOCIATION_COPY_NONATOMIC);
  return socket;
}
static NSString *const URL = @"wss://example.test/socket";
static FTWebSocketMetadataStore *Store(id owner, NSString *session) {
  FTWebSocketMetadataStore *store = [FTWebSocketMetadataStore new];
  Check([store startForOwner:owner session:session]);
  return store;
}
static void Bind(FTWebSocketMetadataStore *store, NSString *key, NSUInteger socketID, NSString *session, double sequence) {
  [store bindResource:key socketID:@(socketID) URL:URL session:session sequence:sequence];
}

#include "WebSocketResourceTests.inc"

int main(void) {
  @autoreleasepool {
    Method clockMethod = class_getClassMethod(FTWebSocketMetadataStore.class, NSSelectorFromString(@"monotonicTime"));
    method_setImplementation(clockMethod, (IMP)FTTestClock);
    IMP originalInit = class_getMethodImplementation(SRWebSocket.class, @selector(initWithURLRequest:protocols:));
    IMP originalOpen = class_getMethodImplementation(SRWebSocket.class, @selector(open));
    IMP originalHeaders = class_getMethodImplementation(SRWebSocket.class, @selector(_HTTPHeadersDidFinish:));
    IMP originalFailure = class_getMethodImplementation(SRWebSocket.class, @selector(_failWithError:));
    id owner = [NSObject new];
    FTWebSocketMetadataStore *store = Store(owner, @"first");
    IMP hook = class_getMethodImplementation(SRWebSocket.class, @selector(initWithURLRequest:protocols:));
    Check(hook != originalInit);
    Check(class_getMethodImplementation(SRWebSocket.class, @selector(open)) == originalOpen);
    Check(class_getMethodImplementation(SRWebSocket.class, @selector(_HTTPHeadersDidFinish:)) != originalHeaders);
    Check(class_getMethodImplementation(SRWebSocket.class, @selector(_failWithError:)) == originalFailure);
    Check([store startForOwner:owner session:@"first"]);
    Check(class_getMethodImplementation(SRWebSocket.class, @selector(initWithURLRequest:protocols:)) == hook);

    // init precedes bind. No RN strong reference remains when JS queries.
    __weak SRWebSocket *weakSocket;
    @autoreleasepool {
      SRWebSocket *socket = Socket(owner, 0, URL);
      weakSocket = socket;
      socket.readyState = 1;
      [socket setResponse:@"HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nX-Test: real\r\n\r\n"];
      Bind(store, @"a", 0, @"first", 1);
    }
    Check(weakSocket != nil);
    @autoreleasepool {
      NSDictionary *response = [store takeResource:@"a" session:@"first"];
      Check([response[@"httpStatus"] isEqual:@101]);
      Check([response[@"httpProtocol"] isEqual:@"HTTP/1.1"]);
      Check([response[@"responseHeader"][@"X-Test"] isEqual:@"real"]);
      Check([store takeResource:@"a" session:@"first"] == nil);
    }
    Check(weakSocket == nil);
    // A duplicate registration cannot restore released ownership.
    Bind(store, @"a", 0, @"first", 1);
    Check([store takeResource:@"a" session:@"first"] == nil);

    // bind precedes init; failure removes RN's reference before the query.
    Bind(store, @"b", 1, @"first", 2);
    @autoreleasepool {
      SRWebSocket *socket = Socket(owner, 1, URL);
      weakSocket = socket;
      socket.readyState = 3;
      [socket setResponse:@"HTTP/1.1 403 Forbidden\r\nX-Rejection: server\r\n\r\n"];
    }
    Check(weakSocket != nil);
    @autoreleasepool { Check([[store takeResource:@"b" session:@"first"][@"httpStatus"] isEqual:@403]); }
    Check(weakSocket == nil);

    // Same numeric ID in two RN modules cannot cross, including same URL.
    id otherOwner = [NSObject new];
    FTWebSocketMetadataStore *other = Store(otherOwner, @"other");
    @autoreleasepool {
      SRWebSocket *one = Socket(owner, 2, URL);
      SRWebSocket *two = Socket(otherOwner, 2, URL);
      one.readyState = two.readyState = 3;
      [one setResponse:@"HTTP/1.1 403 Forbidden\r\n\r\n"];
      [two setResponse:@"HTTP/1.1 503 Unavailable\r\n\r\n"];
      Bind(store, @"c", 2, @"first", 3);
      Bind(other, @"c", 2, @"other", 1);
      Check([other takeResource:@"c" session:@"first"] == nil);
      Check([[store takeResource:@"c" session:@"first"][@"httpStatus"] isEqual:@403]);
      Check([[other takeResource:@"c" session:@"other"][@"httpStatus"] isEqual:@503]);
    }

    // A completion snapshot remains valid regardless of the later socket state.
    for (NSInteger state = 0; state <= 2; state += 2) {
      SRWebSocket *socket = Socket(owner, 3 + state, URL);
      socket.readyState = state;
      [socket setResponse:@"HTTP/1.1 403 Forbidden\r\n\r\n"];
      Bind(store, @"unsafe", 3 + state, @"first", 4 + state);
      Check([[store takeResource:@"unsafe" session:@"first"][@"httpStatus"] isEqual:@403]);
      Check(socket.headerReads == 0);
    }
    SRWebSocket *partial = Socket(owner, 6, URL);
    partial.readyState = 3;
    [partial setResponse:@"HTTP/1.1 403 Forbidden\r\nX-Incomplete: yes"];
    Bind(store, @"partial", 6, @"first", 7);
    Check([store takeResource:@"partial" session:@"first"] == nil);

    SRWebSocket *large = Socket(owner, 7, URL);
    large.readyState = 1;
    [large setResponse:[NSString stringWithFormat:@"HTTP/1.1 101 OK\r\nLarge: %@\r\n\r\n", [@"x" stringByPaddingToLength:17000 withString:@"x" startingAtIndex:0]]];
    Bind(store, @"large", 7, @"first", 8);
    NSDictionary *largeResponse = [store takeResource:@"large" session:@"first"];
    Check([largeResponse[@"httpStatus"] isEqual:@101]);
    Check(largeResponse[@"responseHeader"] == nil);

    // Exact expiry boundaries use the same monotonic pruning code as the timer.
    @autoreleasepool { weakSocket = Socket(owner, 8, URL); }
    [FTWebSocketMetadataStore pruneAtTime:14.999];
    Check(weakSocket != nil);
    atomic_store(&FTTestTime, 15);
    [FTWebSocketMetadataStore pruneAtTime:15];
    Check(weakSocket == nil);
    @autoreleasepool { weakSocket = Socket(owner, 9, URL); Bind(store, @"expiry", 9, @"first", 9); }
    [FTWebSocketMetadataStore pruneAtTime:74.999];
    Check(weakSocket != nil);
    atomic_store(&FTTestTime, 75);
    [FTWebSocketMetadataStore pruneAtTime:75];
    Check(weakSocket == nil);

    // URL mismatch never consumes another connection's HTTP response.
    @autoreleasepool {
      SRWebSocket *socket = Socket(owner, 10, @"wss://other.test/socket");
      socket.readyState = 1;
      [socket setResponse:@"HTTP/1.1 101 OK\r\n\r\n"];
      Bind(store, @"mismatch", 10, @"first", 10);
      Check([store takeResource:@"mismatch" session:@"first"] == nil);
    }
    // Releasing before init does not let a delayed duplicate bind resurrect it.
    Bind(store, @"cancel", 11, @"first", 11);
    [store releaseResource:@"cancel" session:@"first"];
    @autoreleasepool { weakSocket = Socket(owner, 11, URL); }
    Bind(store, @"cancel", 11, @"first", 11);
    Check([store takeResource:@"cancel" session:@"first"] == nil);
    [store clear];
    Check(weakSocket == nil);
    Check([store startForOwner:owner session:@"first-restarted"]);
    // stopCapture preserves bound references and disables new registrations.
    @autoreleasepool {
      SRWebSocket *socket = Socket(owner, 0, URL);
      weakSocket = socket;
      socket.readyState = 1;
      [socket setResponse:@"HTTP/1.1 101 OK\r\n\r\n"];
      Bind(store, @"stopped", 0, @"first-restarted", 1);
    }
    [store stopForSession:@"first-restarted"];
    Check(weakSocket != nil);
    @autoreleasepool { Check([[store takeResource:@"stopped" session:@"first-restarted"][@"httpStatus"] isEqual:@101]); }
    Check(weakSocket == nil);
    Check(![store startForOwner:owner session:@"first-restarted"]);
    Check([store startForOwner:owner session:@"first"]);

    // More than 256 completed handshakes must not exhaust the registration cap.
    for (NSUInteger index = 0; index < 1000; index++) {
      @autoreleasepool {
        SRWebSocket *socket = Socket(owner, index + 10, URL);
        socket.readyState = 1;
        [socket setResponse:@"HTTP/1.1 101 OK\r\n\r\n"];
        Bind(store, @"repeat", index + 10, @"first", index + 10);
        Check([[store takeResource:@"repeat" session:@"first"][@"httpStatus"] isEqual:@101]);
      }
    }

    [store clear];
    [other clear];
    Check(![store startForOwner:owner session:@"first"]);
    store = Store(owner, @"capacity");
    NSHashTable *alive = [NSHashTable weakObjectsHashTable];
    __weak SRWebSocket *oldest;
    for (NSUInteger index = 0; index < 300; index++) {
      @autoreleasepool {
        SRWebSocket *socket = Socket(owner, index, URL);
        [alive addObject:socket];
        if (index == 0) oldest = socket;
      }
    }
    Check(oldest == nil);
    @autoreleasepool { Check(alive.allObjects.count == 256); }
    [FTWebSocketMetadataStore shutDown];
    @autoreleasepool { Check(alive.allObjects.count == 0); }
    Check(![store startForOwner:owner session:@"late-after-shutdown"]);

    // Installed initializer stays transparent after shutdown, including ARC,
    // subclass identity, nil and exceptions. Every original init runs once.
    NSUInteger beforeInit = FTInitializations;
    NSUInteger beforeDealloc = FTDeallocations;
    @autoreleasepool {
      // After shutdown the SDK owns nothing. Keep the application's ownership
      // explicit; an optimized +0 temporary may disappear after weak assignment.
      __attribute__((objc_precise_lifetime)) SRWebSocket *businessSocket = Socket(owner, 10000, URL);
      weakSocket = businessSocket;
      Check(weakSocket != nil);
    }
    Check(weakSocket == nil);
    Check(FTInitializations == beforeInit + 1);
    Check(FTDeallocations == beforeDealloc + 1);
    @autoreleasepool {
      DerivedSocket *derived = [[DerivedSocket alloc] initWithURLRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:URL]] protocols:nil];
      Check(derived.class == DerivedSocket.class);
      Check([[SRWebSocket alloc] initWithURLRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:@"wss://example.test/nil"]] protocols:nil] == nil);
      @try {
        (void)[[SRWebSocket alloc] initWithURLRequest:[NSURLRequest requestWithURL:[NSURL URLWithString:@"wss://example.test/throw"]] protocols:nil];
        Check(NO);
      } @catch (NSException *exception) { Check([exception.name isEqual:@"original-init"]); }
    }
    [FTWebSocketMetadataStore sdkDidStart];
    Check([store startForOwner:owner session:@"new-lifecycle"]);
    @autoreleasepool { weakSocket = Socket(owner, 0, URL); Bind(store, @"new", 0, @"new-lifecycle", 1); }
    Check(weakSocket != nil);
    [store releaseResource:@"new" session:@"capacity"];
    Check(weakSocket != nil);
    [store releaseResource:@"new" session:@"new-lifecycle"];
    Check(weakSocket == nil);
    [FTWebSocketMetadataStore shutDown];
    TestNativeResourceReporting();
    printf("PASS: %lu native assertions (production store, simulated sockets)\n", (unsigned long)FTAssertions);
  }
  return 0;
}
