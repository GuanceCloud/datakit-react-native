#import "FTWebSocketMetadataStore.h"
#import <CFNetwork/CFNetwork.h>
#import <objc/runtime.h>
#include <math.h>
#include <stdatomic.h>

static const NSUInteger FTMaximumHandshakes = 256;
static const NSUInteger FTMaximumResponseHeaderBytes = 16 * 1024;
static const NSTimeInterval FTCandidateLifetime = 5;
static const NSTimeInterval FTResourceLifetime = 60;

// Association accessors are inspected on main. Response data is copied only
// at response completion, synchronously on that method's caller queue.
@protocol FTWebSocketMetadataSource <NSObject>
@property (nonatomic, readonly) id delegate;
@property (nonatomic, readonly) NSURL *url;
@end

// SR 0.7.0 has a parameterless completion method. This public accessor is used
// only synchronously at that method's entry, never by a terminal bridge call.
@protocol FTWebSocketLegacyResponseSource <NSObject>
@property (nonatomic, readonly) CFHTTPMessageRef receivedHTTPHeaders;
@end

@interface FTWebSocketCandidate : NSObject
@property (nonatomic, strong) id<FTWebSocketMetadataSource> socket;
@property (nonatomic, weak) FTWebSocketMetadataStore *store;
@property (nonatomic, copy) NSString *session;
@property (nonatomic, copy) NSNumber *socketID;
@property (nonatomic, copy) NSString *URL;
@property (nonatomic, copy) NSString *resourceKey;
@property (nonatomic) NSUInteger revision;
@property (nonatomic) NSTimeInterval expires;
@property (nonatomic) BOOL associated;
@property (nonatomic) BOOL snapshotStarted;
@property (nonatomic, copy) NSDictionary *snapshot;
@end
@implementation FTWebSocketCandidate
@end

@interface FTWebSocketBinding : NSObject
@property (nonatomic, copy) NSNumber *socketID;
@property (nonatomic, copy) NSString *URL;
@property (nonatomic) NSTimeInterval expires;
@property (nonatomic, weak) FTWebSocketCandidate *candidate;
@end
@implementation FTWebSocketBinding
@end

@interface FTWebSocketTerminal : NSObject
@property (nonatomic, weak) FTWebSocketMetadataStore *store;
@property (nonatomic, copy) NSString *key;
@property (nonatomic, copy) NSDictionary *metadata;
@property (nonatomic, copy) NSString *event;
@property (nonatomic) BOOL completed;
@property (nonatomic) NSTimeInterval expires;
@end
@implementation FTWebSocketTerminal
@end

@interface FTWebSocketMetadataStore ()
@property (nonatomic, weak) id owner;
@property (nonatomic, copy) NSString *session;
@property (nonatomic) NSUInteger revision;
@property (nonatomic) BOOL enabled;
// stop disables new capture; clear/shutdown also invalidate in-flight reporting.
@property (nonatomic) BOOL valid;
@property (nonatomic) BOOL metadataAvailable;
@property (nonatomic) double lastBindingSequence;
@property (nonatomic) double lastResourceSequence;
@property (nonatomic, strong) NSMutableDictionary<NSString *, FTWebSocketBinding *> *bindings;
@property (nonatomic, strong) NSMutableDictionary<NSString *, FTWebSocketTerminal *> *terminals;
+ (NSTimeInterval)monotonicTime;
+ (void)recordSocket:(id<FTWebSocketMetadataSource>)socket;
+ (void)associateCandidates;
+ (void)pruneAtTime:(NSTimeInterval)now;
+ (void)captureResponse:(CFHTTPMessageRef)response forSocket:(id)socket readFromSocket:(BOOL)readFromSocket;
+ (NSDictionary *)responseSnapshot:(CFHTTPMessageRef)response;
@end

// One recursive lock protects all registry state, including native shutdown on
// a different module queue. RN association accessors are inspected only on main.
static NSObject *FTRegistryLock(void) {
  static NSObject *lock;
  static dispatch_once_t once;
  dispatch_once(&once, ^{ lock = [NSObject new]; });
  return lock;
}
static NSMutableArray<FTWebSocketCandidate *> *FTCandidates(void) {
  static NSMutableArray *candidates;
  static dispatch_once_t once;
  dispatch_once(&once, ^{ candidates = [NSMutableArray new]; });
  return candidates;
}
// Pointer identity avoids invoking socket hash/isEqual implementations. Values
// are owned by the bounded registry; weak keys add no socket ownership.
static NSMapTable<id, FTWebSocketCandidate *> *FTCandidateIndex(void) {
  static NSMapTable *index;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    index = [NSMapTable mapTableWithKeyOptions:NSPointerFunctionsWeakMemory | NSPointerFunctionsObjectPointerPersonality
                                valueOptions:NSPointerFunctionsStrongMemory];
  });
  return index;
}
static atomic_bool FTRegisterSockets;
static atomic_bool FTHaveCandidates;
static void FTDiscardCandidate(FTWebSocketCandidate *candidate) {
  if (!candidate) return;
  // Weak-property loads can temporarily autorelease an entry. Clearing its
  // payload makes reference release independent of the caller's pool lifetime.
  @autoreleasepool {
    if (candidate.socket && [FTCandidateIndex() objectForKey:candidate.socket] == candidate)
      [FTCandidateIndex() removeObjectForKey:candidate.socket];
    candidate.socket = nil;
    candidate.snapshot = nil;
    [FTCandidates() removeObject:candidate];
    atomic_store(&FTHaveCandidates, FTCandidates().count != 0);
  }
}
static NSHashTable<FTWebSocketMetadataStore *> *FTStores(void) {
  static NSHashTable *stores;
  static dispatch_once_t once;
  dispatch_once(&once, ^{ stores = [NSHashTable weakObjectsHashTable]; });
  return stores;
}
static NSMutableArray<FTWebSocketTerminal *> *FTTerminals(void) {
  static NSMutableArray *terminals;
  static dispatch_once_t once;
  dispatch_once(&once, ^{ terminals = [NSMutableArray new]; });
  return terminals;
}
static void FTDiscardTerminal(FTWebSocketTerminal *terminal) {
  terminal.metadata = nil;
  [terminal.store.terminals removeObjectForKey:terminal.key];
  [FTTerminals() removeObject:terminal];
}
static NSUInteger FTRevision;
static BOOL FTSDKStopped;
static BOOL FTAssociationScheduled;
static dispatch_source_t FTSweepTimer;
static Class FTInstrumentedSocketClass;

static NSTimeInterval FTNow(void) { return [FTWebSocketMetadataStore monotonicTime]; }

static BOOL FTMethodMatches(Class cls, SEL selector, const char *result, unsigned int arguments, const char *argumentType) {
  Method method = class_getInstanceMethod(cls, selector);
  if (!method || method_getNumberOfArguments(method) != arguments + 2) return NO;
  char *type = method_copyReturnType(method);
  BOOL matches = strcmp(type, result) == 0;
  free(type);
  for (unsigned int index = 0; matches && index < arguments; index++) {
    type = method_copyArgumentType(method, index + 2);
    matches = strcmp(type, argumentType) == 0;
    free(type);
  }
  return matches;
}

// Calling an init IMP must consume the allocated receiver and return +1.
// An ordinary block IMP has +0 conventions and would leak/over-release here.
typedef id (*FTSocketInitializer)(id __attribute__((ns_consumed)), SEL, id, id) __attribute__((ns_returns_retained));
static FTSocketInitializer FTOriginalInitializer;
static id FTInitializeSocket(id socket __attribute__((ns_consumed)), SEL selector, id request, id protocols) __attribute__((ns_returns_retained));
static id __attribute__((ns_returns_retained)) FTInitializeSocket(id socket __attribute__((ns_consumed)), SEL selector, id request, id protocols) {
  id result = FTOriginalInitializer(socket, selector, request, protocols);
  // RN 0.74/0.76 connects on main. Other call paths remain transparent.
  if (result && atomic_load(&FTRegisterSockets) && NSThread.isMainThread) {
    @try { [FTWebSocketMetadataStore recordSocket:result]; }
    @catch (__unused NSException *exception) {}
  }
  return result;
}

typedef void (*FTSocketResponseCompletion)(id, SEL, CFHTTPMessageRef);
static FTSocketResponseCompletion FTOriginalResponseCompletion;
static void FTResponseCompleted(id socket, SEL selector, CFHTTPMessageRef response) {
  if (atomic_load(&FTHaveCandidates)) {
    @autoreleasepool {
      @try { [FTWebSocketMetadataStore captureResponse:response forSocket:socket readFromSocket:NO]; }
      @catch (__unused NSException *exception) {}
    }
  }
  // Never call business code under a registry lock or swallow its exception.
  FTOriginalResponseCompletion(socket, selector, response);
}

typedef void (*FTSocketLegacyResponseCompletion)(id, SEL);
static FTSocketLegacyResponseCompletion FTOriginalLegacyResponseCompletion;
static void FTLegacyResponseCompleted(id socket, SEL selector) {
  if (atomic_load(&FTHaveCandidates)) {
    @autoreleasepool {
      @try { [FTWebSocketMetadataStore captureResponse:NULL forSocket:socket readFromSocket:YES]; }
      @catch (__unused NSException *exception) {}
    }
  }
  FTOriginalLegacyResponseCompletion(socket, selector);
}

static BOOL FTInstallHooks(void) {
  static BOOL installed;
  if (installed) return YES;
  Class cls = NSClassFromString(@"SRWebSocket");
  SEL selector = NSSelectorFromString(@"initWithURLRequest:protocols:");
  SEL responseSelector = NSSelectorFromString(@"_HTTPHeadersDidFinish:");
  BOOL legacy = cls && !class_getInstanceMethod(cls, responseSelector);
  if (legacy) responseSelector = NSSelectorFromString(@"_HTTPHeadersDidFinish");
  // Validate the entire capability before installing either hook. Matching an
  // ABI cannot establish unchanged semantics in a future SocketRocket version.
  if (!cls || !FTMethodMatches(cls, selector, @encode(id), 2, @encode(id)) ||
      !FTMethodMatches(cls, @selector(delegate), @encode(id), 0, NULL) ||
      !FTMethodMatches(cls, @selector(url), @encode(id), 0, NULL) ||
      !FTMethodMatches(cls, responseSelector, @encode(void), legacy ? 0 : 1, @encode(CFHTTPMessageRef)) ||
      (legacy && !FTMethodMatches(cls, @selector(receivedHTTPHeaders), @encode(CFHTTPMessageRef), 0, NULL))) return NO;
  Method method = class_getInstanceMethod(cls, selector);
  Method responseMethod = class_getInstanceMethod(cls, responseSelector);
  FTInstrumentedSocketClass = cls;
  FTOriginalInitializer = (FTSocketInitializer)method_getImplementation(method);
  if (legacy) FTOriginalLegacyResponseCompletion = (FTSocketLegacyResponseCompletion)method_getImplementation(responseMethod);
  else FTOriginalResponseCompletion = (FTSocketResponseCompletion)method_getImplementation(responseMethod);
  class_replaceMethod(cls, responseSelector, legacy ? (IMP)FTLegacyResponseCompleted : (IMP)FTResponseCompleted, method_getTypeEncoding(responseMethod));
  class_replaceMethod(cls, selector, (IMP)FTInitializeSocket, method_getTypeEncoding(method));
  installed = YES;
  return YES;
}

static void FTEnsureTimer(void) {
  BOOL registrationEnabled = NO;
  for (FTWebSocketMetadataStore *store in FTStores())
    registrationEnabled |= store.enabled && store.metadataAvailable && store.owner != nil;
  atomic_store(&FTRegisterSockets, registrationEnabled);
  NSTimeInterval earliest = INFINITY;
  for (FTWebSocketCandidate *candidate in FTCandidates()) earliest = MIN(earliest, candidate.expires);
  for (FTWebSocketTerminal *terminal in FTTerminals()) earliest = MIN(earliest, terminal.expires);
  for (FTWebSocketMetadataStore *store in FTStores()) {
    for (FTWebSocketBinding *binding in store.bindings.allValues) earliest = MIN(earliest, binding.expires);
  }
  if (!isfinite(earliest)) {
    if (FTSweepTimer) { dispatch_source_cancel(FTSweepTimer); FTSweepTimer = nil; }
    return;
  }
  if (!FTSweepTimer) {
    FTSweepTimer = dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, 0,
                                          dispatch_get_global_queue(QOS_CLASS_UTILITY, 0));
    dispatch_source_set_event_handler(FTSweepTimer, ^{
      [FTWebSocketMetadataStore pruneAtTime:FTNow()];
    });
    dispatch_resume(FTSweepTimer);
  }
  // One timer for the nearest deadline. It stops when the registry is empty;
  // no per-socket polling, and no extra one-second retention after expiry.
  int64_t delay = (int64_t)(MAX(0, earliest - FTNow()) * NSEC_PER_SEC);
  dispatch_source_set_timer(FTSweepTimer, dispatch_time(DISPATCH_TIME_NOW, delay), DISPATCH_TIME_FOREVER, 0);
}

static NSString *FTNormalizedURL(NSString *URL) {
  return [URL isKindOfClass:NSString.class] ? [NSURL URLWithString:URL].absoluteString : nil;
}

@implementation FTWebSocketMetadataStore
+ (NSTimeInterval)monotonicTime { return NSProcessInfo.processInfo.systemUptime; }
- (instancetype)init {
  if ((self = [super init])) {
    _bindings = [NSMutableDictionary new];
    _terminals = [NSMutableDictionary new];
    @synchronized (FTRegistryLock()) { [FTStores() addObject:self]; }
  }
  return self;
}

- (BOOL)startForOwner:(id)owner session:(NSString *)session {
  if (!NSThread.isMainThread || session.length == 0) return NO;
  @synchronized (FTRegistryLock()) {
    if (FTSDKStopped) return NO;
    if ([self.session isEqualToString:session]) return self.enabled && self.owner == owner;
    [self clear];
    self.owner = owner;
    self.session = session;
    self.revision = ++FTRevision;
    self.enabled = YES;
    self.valid = YES;
    // Reporting and its URL/privacy policies remain available even when native
    // socket enrichment is unsupported. No JS route switch is needed.
    self.metadataAvailable = NO;
    @try {
      self.metadataAvailable = owner && FTInstallHooks();
    } @catch (__unused NSException *exception) {
      // Association is optional. Keep the native Resource policy and reporting.
    }
    self.lastBindingSequence = 0;
    self.lastResourceSequence = 0;
    FTEnsureTimer();
    return YES;
  }
}

- (void)stopForSession:(NSString *)session {
  @synchronized (FTRegistryLock()) {
    if (![self.session isEqualToString:session]) return;
    if (NSThread.isMainThread) [[self class] associateCandidates];
    self.enabled = NO;
    self.revision = ++FTRevision;
    // Keep bound handshakes for their JS terminal, discard unmatched candidates.
    for (FTWebSocketCandidate *candidate in FTCandidates().copy) {
      if (candidate.store == self && !candidate.resourceKey) FTDiscardCandidate(candidate);
    }
    FTEnsureTimer();
  }
}

- (void)clear {
  @synchronized (FTRegistryLock()) {
    if (NSThread.isMainThread) [[self class] associateCandidates];
    self.enabled = NO;
    self.valid = NO;
    self.revision = ++FTRevision;
    [self.bindings removeAllObjects];
    for (FTWebSocketTerminal *terminal in self.terminals.allValues) FTDiscardTerminal(terminal);
    for (FTWebSocketCandidate *candidate in FTCandidates().copy) {
      if (candidate.store == self) FTDiscardCandidate(candidate);
    }
    self.owner = nil;
    FTEnsureTimer();
    // Remember the closed session so a repeated start cannot resurrect it.
  }
}

+ (void)sdkDidStart {
  @synchronized (FTRegistryLock()) { FTSDKStopped = NO; }
}

+ (void)shutDown {
  @synchronized (FTRegistryLock()) {
    FTSDKStopped = YES;
    for (FTWebSocketMetadataStore *store in FTStores()) [store clear];
    for (FTWebSocketCandidate *candidate in FTCandidates().copy) FTDiscardCandidate(candidate);
    [self pruneAtTime:FTNow()];
  }
}

+ (void)pruneAtTime:(NSTimeInterval)now {
  @synchronized (FTRegistryLock()) {
    for (FTWebSocketCandidate *candidate in FTCandidates().copy) {
      if (candidate.expires <= now || (candidate.associated && !candidate.store.owner)) {
        [candidate.store.bindings removeObjectForKey:candidate.resourceKey ?: @""];
        FTDiscardCandidate(candidate);
      }
    }
    for (FTWebSocketMetadataStore *store in FTStores()) {
      for (NSString *key in store.bindings.allKeys) {
        if (store.bindings[key].expires <= now || !store.owner) [store.bindings removeObjectForKey:key];
      }
    }
    for (FTWebSocketTerminal *terminal in FTTerminals().copy) {
      if (terminal.expires <= now || !terminal.store.valid) FTDiscardTerminal(terminal);
    }
    FTEnsureTimer();
  }
}

+ (void)recordSocket:(id<FTWebSocketMetadataSource>)socket {
  // Base-class ABI checks do not validate overridden subclass accessors or
  // response lifetime. Standard RN allocates this exact class. Other objects
  // retain the native Resource route without socket enrichment or ownership.
  if (object_getClass(socket) != FTInstrumentedSocketClass) return;
  @synchronized (FTRegistryLock()) {
    if (FTSDKStopped) return;
    BOOL enabled = NO;
    for (FTWebSocketMetadataStore *store in FTStores()) enabled |= store.enabled && store.metadataAvailable && store.owner != nil;
    if (!enabled) return;
    [self pruneAtTime:FTNow()];
    if ([FTCandidateIndex() objectForKey:socket]) return;
    if (FTCandidates().count >= FTMaximumHandshakes) {
      FTWebSocketCandidate *oldest = FTCandidates().firstObject;
      [oldest.store.bindings removeObjectForKey:oldest.resourceKey ?: @""];
      FTDiscardCandidate(oldest);
    }
    FTWebSocketCandidate *candidate = [FTWebSocketCandidate new];
    candidate.socket = socket;
    candidate.expires = FTNow() + FTCandidateLifetime;
    candidate.revision = FTRevision;
    [FTCandidates() addObject:candidate];
    [FTCandidateIndex() setObject:candidate forKey:socket];
    atomic_store(&FTHaveCandidates, true);
    FTEnsureTimer();
    // One deferred pass per main-queue batch; the block retains no sockets.
    if (!FTAssociationScheduled) {
      FTAssociationScheduled = YES;
      dispatch_async(dispatch_get_main_queue(), ^{
        @synchronized (FTRegistryLock()) {
          FTAssociationScheduled = NO;
          [self associateCandidates];
        }
      });
    }
  }
}

+ (NSDictionary *)responseSnapshot:(CFHTTPMessageRef)response {
  if (!response || !CFHTTPMessageIsHeaderComplete(response)) return nil;
  NSMutableDictionary *result = [NSMutableDictionary new];
  result[@"httpStatus"] = @(CFHTTPMessageGetResponseStatusCode(response));
  NSString *version = CFBridgingRelease(CFHTTPMessageCopyVersion(response));
  if (version.length) result[@"httpProtocol"] = [version copy];
  NSDictionary *fields = CFBridgingRelease(CFHTTPMessageCopyAllHeaderFields(response));
  NSMutableDictionary *headers = [NSMutableDictionary new];
  NSUInteger bytes = 0;
  for (NSString *name in fields) {
    NSString *value = fields[name];
    if (![name isKindOfClass:NSString.class] || ![value isKindOfClass:NSString.class]) return [result copy];
    NSUInteger nameBytes = [name lengthOfBytesUsingEncoding:NSUTF8StringEncoding];
    NSUInteger valueBytes = [value lengthOfBytesUsingEncoding:NSUTF8StringEncoding];
    if (nameBytes > FTMaximumResponseHeaderBytes || valueBytes > FTMaximumResponseHeaderBytes ||
        nameBytes + valueBytes + 4 > FTMaximumResponseHeaderBytes - bytes) return [result copy];
    bytes += nameBytes + valueBytes + 4;
    headers[[name copy]] = [value copy];
  }
  if (fields) result[@"responseHeader"] = [headers copy];
  return [result copy];
}

+ (void)captureResponse:(CFHTTPMessageRef)response forSocket:(id)socket readFromSocket:(BOOL)readFromSocket {
  FTWebSocketCandidate *candidate;
  @synchronized (FTRegistryLock()) {
    // Check the runtime class, not -class/isKindOfClass:, which can be overridden.
    // A later isa change must not expose an unvalidated legacy response getter.
    if (FTSDKStopped || object_getClass(socket) != FTInstrumentedSocketClass) return;
    candidate = [FTCandidateIndex() objectForKey:socket];
    if (!candidate || candidate.snapshotStarted || candidate.expires <= FTNow()) return;
    candidate.snapshotStarted = YES;
  }
  // Keep the SR 0.7.0 receiver alive through extraction of its borrowed response.
  // Both known completion methods run synchronously after header parsing. No
  // queue handoff, CF pointer retention or registry lock spans this extraction.
  __attribute__((objc_precise_lifetime)) id<FTWebSocketLegacyResponseSource> source = socket;
  if (readFromSocket) response = source.receivedHTTPHeaders;
  NSDictionary *snapshot = [self responseSnapshot:response];
  @synchronized (FTRegistryLock()) {
    // Cleanup/stopResource may have won while copying. Never recreate a record,
    // attach to a reused ID, or commit into a later SDK capture lifecycle.
    if (FTSDKStopped || object_getClass(socket) != FTInstrumentedSocketClass ||
        [FTCandidateIndex() objectForKey:socket] != candidate ||
        candidate.expires <= FTNow()) return;
    candidate.snapshot = snapshot;
  }
}

+ (void)associateCandidates {
  if (!NSThread.isMainThread) return;
  [self pruneAtTime:FTNow()];
  for (FTWebSocketCandidate *candidate in FTCandidates().copy) {
    if (candidate.associated) continue;
    @try {
      id owner = candidate.socket.delegate;
      NSNumber *socketID = objc_getAssociatedObject(candidate.socket, NSSelectorFromString(@"reactTag"));
      if (![socketID isKindOfClass:NSNumber.class] || !isfinite(socketID.doubleValue) ||
          socketID.doubleValue < 0 || socketID.doubleValue > 9007199254740991.0 ||
          socketID.doubleValue != floor(socketID.doubleValue)) {
        FTDiscardCandidate(candidate);
        continue;
      }
      FTWebSocketMetadataStore *matched;
      for (FTWebSocketMetadataStore *store in FTStores()) {
        if (store.enabled && store.metadataAvailable && store.owner == owner && store.revision <= candidate.revision) { matched = store; break; }
      }
      if (!matched) { FTDiscardCandidate(candidate); continue; }
      candidate.store = matched;
      candidate.session = matched.session;
      candidate.socketID = socketID;
      candidate.URL = candidate.socket.url.absoluteString;
      candidate.associated = YES;
      for (NSString *key in matched.bindings.allKeys) {
        FTWebSocketBinding *binding = matched.bindings[key];
        if ([binding.socketID isEqual:socketID] && [binding.URL isEqual:candidate.URL]) {
          if (binding.candidate) { FTDiscardCandidate(candidate); break; }
          candidate.resourceKey = key;
          candidate.expires = binding.expires;
          binding.candidate = candidate;
          break;
        }
      }
    } @catch (__unused NSException *exception) { FTDiscardCandidate(candidate); }
  }
  FTEnsureTimer();
}

- (void)bindResource:(NSString *)key socketID:(NSNumber *)socketID URL:(NSString *)URL session:(NSString *)session sequence:(double)sequence {
  if (!isfinite(sequence) || sequence <= 0 || sequence > 9007199254740991.0 || sequence != floor(sequence)) return;
  if (!NSThread.isMainThread || key.length == 0 || key.length > 128 ||
      !isfinite(socketID.doubleValue) || socketID.doubleValue < 0 ||
      socketID.doubleValue > 9007199254740991.0 || socketID.doubleValue != floor(socketID.doubleValue)) return;
  NSString *normalizedURL = FTNormalizedURL(URL);
  if (!normalizedURL.length) return;
  @synchronized (FTRegistryLock()) {
    if (!self.enabled || !self.metadataAvailable || !self.owner || ![self.session isEqualToString:session]) return;
    // This bridge uses one serial main queue; JS assigns sequence at bind
    // invocation. The watermark rejects late duplicates without accumulating
    // a tombstone per completed handshake.
    if (sequence <= self.lastBindingSequence) return;
    self.lastBindingSequence = sequence;
    [[self class] associateCandidates];
    if (self.bindings[key]) return;
    // Bound pending registrations as well as retained socket objects.
    if (self.bindings.count >= FTMaximumHandshakes) return;
    FTWebSocketBinding *binding = [FTWebSocketBinding new];
    binding.socketID = socketID;
    binding.URL = normalizedURL;
    binding.expires = FTNow() + FTResourceLifetime;
    self.bindings[key] = binding;
    for (FTWebSocketCandidate *candidate in FTCandidates()) {
      if (candidate.store == self && [candidate.session isEqual:session] && !candidate.resourceKey &&
          [candidate.socketID isEqual:socketID] && [candidate.URL isEqual:normalizedURL]) {
        candidate.resourceKey = key;
        candidate.expires = binding.expires;
        binding.candidate = candidate;
        break;
      }
    }
    FTEnsureTimer();
  }
}

- (void)releaseResource:(NSString *)key session:(NSString *)session {
  @synchronized (FTRegistryLock()) {
    if (![self.session isEqualToString:session]) return;
    FTWebSocketBinding *binding = self.bindings[key];
    FTDiscardCandidate(binding.candidate);
    [self.bindings removeObjectForKey:key];
    FTEnsureTimer();
  }
}

- (NSDictionary *)takeResource:(NSString *)key session:(NSString *)session {
  if (!NSThread.isMainThread) return nil;
  @synchronized (FTRegistryLock()) {
    if (![self.session isEqualToString:session]) return nil;
    [[self class] associateCandidates];
    FTWebSocketBinding *binding = self.bindings[key];
    if (!binding) return nil;
    NSDictionary *snapshot = binding.candidate.snapshot;
    [self releaseResource:key session:session];
    return snapshot;
  }
}

- (BOOL)canReportKey:(NSString *)key session:(NSString *)session {
  return NSThread.isMainThread && !FTSDKStopped && self.valid && key.length > 0 && key.length <= 128 &&
    [self.session isEqualToString:session];
}

- (FTWebSocketTerminal *)terminalForKey:(NSString *)key event:(NSString *)event {
  FTWebSocketTerminal *terminal = self.terminals[key];
  if (terminal) return terminal;
  if (FTTerminals().count >= FTMaximumHandshakes) FTDiscardTerminal(FTTerminals().firstObject);
  terminal = [FTWebSocketTerminal new];
  terminal.store = self;
  terminal.key = key;
  terminal.event = [event isEqualToString:@"open"] ? @"open" : @"error";
  terminal.expires = FTNow() + FTResourceLifetime;
  self.terminals[key] = terminal;
  [FTTerminals() addObject:terminal];
  FTEnsureTimer();
  return terminal;
}

- (void)startResource:(NSString *)key socketID:(NSNumber *)socketID URL:(NSString *)URL session:(NSString *)session sequence:(double)sequence report:(void (^)(void))report {
  @synchronized (FTRegistryLock()) {
    if (![self canReportKey:key session:session] || !self.enabled ||
        !isfinite(sequence) || sequence <= self.lastResourceSequence || sequence > 9007199254740991.0 || sequence != floor(sequence)) return;
    self.lastResourceSequence = sequence;
    if (self.terminals[key] || self.bindings[key]) return;
    @try {
      // Missing/unsupported IDs simply skip association. Reporting still uses
      // the basic JS data through this same route, with no second bridge.
      [self bindResource:key socketID:socketID URL:URL session:session sequence:sequence];
      report();
    } @catch (NSException *exception) {
      [self cancelResource:key session:session];
      @throw exception;
    }
  }
}

- (void)stopResource:(NSString *)key event:(NSString *)event session:(NSString *)session report:(void (^)(void))report {
  @synchronized (FTRegistryLock()) {
    if (![self canReportKey:key session:session]) return;
    [[self class] pruneAtTime:FTNow()];
    if (self.terminals[key]) return; // First JS terminal wins, including open then close.
    NSDictionary *metadata = [self takeResource:key session:session];
    FTWebSocketTerminal *terminal = [self terminalForKey:key event:event];
    terminal.metadata = metadata;
    report(); // The socket was released before the RUM call or promise resolves.
  }
}

- (void)addResource:(NSString *)key event:(NSString *)event session:(NSString *)session report:(void (^)(NSDictionary *, NSString *))report {
  @synchronized (FTRegistryLock()) {
    if (![self canReportKey:key session:session]) return;
    [[self class] pruneAtTime:FTNow()];
    // A missing/expired snapshot or failed stop bridge uses basic data. This
    // never creates a socket binding or reads a socket after its release.
    FTWebSocketTerminal *terminal = [self terminalForKey:key event:event];
    if (terminal.completed) return;
    terminal.completed = YES;
    NSDictionary *metadata = terminal.metadata;
    terminal.metadata = nil;
    [self releaseResource:key session:session];
    report(metadata, terminal.event);
  }
}

- (BOOL)cancelResource:(NSString *)key session:(NSString *)session {
  @synchronized (FTRegistryLock()) {
    [self releaseResource:key session:session];
    if (![self canReportKey:key session:session]) return NO;
    FTWebSocketTerminal *terminal = [self terminalForKey:key event:@"error"];
    terminal.completed = YES;
    terminal.metadata = nil;
    return YES;
  }
}
@end
