#import "FTReactNativeWebSocket.h"
#import "FTWebSocketMetadataStore.h"
#import "FTWebSocketResourceData.h"
#import "FTReactNativeResource.h"
#import <GuanceSDK/FTExternalDataManager.h>
#import <GuanceSDK/FTURLSessionInterceptor.h>
#import <GuanceSDK/FTURLSessionInterceptorProtocol.h>
#import <React/RCTBridge.h>

@interface FTReactNativeWebSocket ()
// Retired capture sessions can finish after configuration disables/re-enables
// collection. Each store keeps its own association namespace; all socket refs
// still share the process-wide 256 cap and native expiry timer.
@property (nonatomic, strong) NSMutableDictionary<NSString *, FTWebSocketMetadataStore *> *sessions;
@property (nonatomic, strong) NSMutableArray<NSString *> *sessionOrder;
@property (nonatomic, copy) NSString *currentSession;
// Capture the current native instance weakly. Cancellation must not call
// +shared after shutdown and accidentally recreate an interceptor singleton.
@property (nonatomic, weak) id<FTURLSessionInterceptorProtocol> resourceInterceptor;
@end

@implementation FTReactNativeWebSocket
@synthesize bridge = _bridge;
RCT_EXPORT_MODULE()

+ (BOOL)requiresMainQueueSetup { return NO; }

- (instancetype)init {
  if ((self = [super init])) {
    _sessions = [NSMutableDictionary new];
    _sessionOrder = [NSMutableArray new];
  }
  return self;
}

- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }

RCT_REMAP_METHOD(startCapture,
                 startCapture:(NSString *)session
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject) {
  @synchronized (self) {
    @try {
      if (self.sessions[session]) {
        // A duplicate setup cannot reactivate a retired session.
        resolve(nil);
        return;
      }
      id owner = nil;
      @try {
        Class moduleClass = NSClassFromString(@"RCTWebSocketModule");
        owner = moduleClass ? [self.bridge moduleForClass:moduleClass] : nil;
      } @catch (__unused NSException *exception) {
        // RN module lookup only affects optional socket enrichment.
      }
      [self.sessions[self.currentSession ?: @""] stopForSession:self.currentSession];
      FTWebSocketMetadataStore *store = [FTWebSocketMetadataStore new];
      if ([store startForOwner:owner session:session]) {
        // Bound bookkeeping for repeated configuration as well as socket refs.
        if (self.sessionOrder.count >= 256) {
          NSString *oldest = self.sessionOrder.firstObject;
          [self.sessions[oldest] clear];
          [self.sessions removeObjectForKey:oldest];
          [self.sessionOrder removeObjectAtIndex:0];
        }
        self.sessions[session] = store;
        [self.sessionOrder addObject:session];
        self.currentSession = session;
      }
      resolve(nil);
    } @catch (__unused NSException *exception) { reject(@"E_WS_CAPTURE", @"Unable to create WebSocket capture session", nil); }
  }
}

RCT_REMAP_METHOD(stopCapture,
                 stopCapture:(NSString *)session
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject) {
  @synchronized (self) {
    [self.sessions[session] stopForSession:session];
    resolve(nil);
  }
}

RCT_REMAP_METHOD(clear,
                 clear:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject) {
  @synchronized (self) {
    [self clearSessions];
    resolve(nil);
  }
}

RCT_REMAP_METHOD(startResource,
                 startResource:(NSString *)key
                 socketID:(double)socketID
                 url:(NSString *)url
                 session:(NSString *)session
                 sequence:(double)sequence
                 property:(NSDictionary *)property
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject) {
  @synchronized (self) {
    @try {
      FTWebSocketMetadataStore *store = self.sessions[session];
      [store startResource:key socketID:@(socketID) URL:url session:session sequence:sequence report:^{
        // The store invokes this block under its SDK lifecycle lock. Resolve
        // the singleton here, before shutdown can clear the native instance.
        id<FTURLSessionInterceptorProtocol> interceptor = (id)[FTURLSessionInterceptor shared];
        self.resourceInterceptor = interceptor;
        FTResourceUrlHandler blocked = nil;
        FTIntakeUrl allowed = nil;
        if ([interceptor respondsToSelector:@selector(resourceUrlHandler)]) blocked = interceptor.resourceUrlHandler;
        if ([interceptor respondsToSelector:@selector(intakeUrlHandler)]) allowed = interceptor.intakeUrlHandler;
        if (!FTWebSocketShouldCollectResource([NSURL URLWithString:url], blocked, allowed)) {
          // Cancel also leaves a terminal tombstone, so queued stop/add cannot
          // report a filtered Resource or retain its socket until expiry.
          [store cancelResource:key session:session];
          FTWebSocketDiscardTraceResource(interceptor, key);
          return;
        }
        [[FTExternalDataManager sharedManager] startResourceWithKey:key property:property];
      }];
      resolve(nil);
    } @catch (__unused NSException *exception) {
      if ([self.sessions[session] cancelResource:key session:session]) {
        FTWebSocketDiscardTraceResource(self.resourceInterceptor, key);
      }
      reject(@"E_WS_RESOURCE", @"Unable to start WebSocket resource", nil);
    }
  }
}

RCT_REMAP_METHOD(stopResource,
                 stopResource:(NSString *)key
                 event:(NSString *)event
                 session:(NSString *)session
                 property:(NSDictionary *)property
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject) {
  @synchronized (self) {
    @try {
      [self.sessions[session] stopResource:key event:event session:session report:^{
        [[FTExternalDataManager sharedManager] stopResourceWithKey:key property:property];
      }];
      resolve(nil);
    } @catch (__unused NSException *exception) { reject(@"E_WS_RESOURCE", @"Unable to stop WebSocket resource", nil); }
  }
}

RCT_REMAP_METHOD(addResource,
                 addResource:(NSString *)key
                 content:(NSDictionary *)content
                 metrics:(NSDictionary *)metrics
                 session:(NSString *)session
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject) {
  @synchronized (self) {
    @try {
      [self.sessions[session] addResource:key event:content[@"webSocketEvent"] session:session report:^(NSDictionary *metadata, NSString *event) {
        NSDictionary *data = FTWebSocketResourceData(content, metrics, metadata, event);
        FTAddReactNativeResource(key, data[@"content"], data[@"metrics"]);
      }];
      resolve(nil);
    } @catch (__unused NSException *exception) { reject(@"E_WS_RESOURCE", @"Unable to add WebSocket resource", nil); }
  }
}

RCT_REMAP_METHOD(releaseResource,
                 releaseResource:(NSString *)key
                 session:(NSString *)session
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject) {
  @synchronized (self) {
    if ([self.sessions[session] cancelResource:key session:session]) {
      FTWebSocketDiscardTraceResource(self.resourceInterceptor, key);
    }
    resolve(nil);
  }
}

- (void)invalidate { [self clearSessions]; }
- (void)clearSessions {
  @synchronized (self) {
    for (FTWebSocketMetadataStore *store in self.sessions.allValues) [store clear];
    [self.sessions removeAllObjects];
    [self.sessionOrder removeAllObjects];
    self.currentSession = nil;
    self.resourceInterceptor = nil;
  }
}
- (void)dealloc {
  for (FTWebSocketMetadataStore *store in _sessions.allValues) [store clear];
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeFTReactNativeWebSocketSpecJSI>(params);
}
#endif
@end
