//
//  FTReactNativeTrace.m
//  FtMobileAgent
//
//  Created by Hu Leilei on 2021/12/14.
//  Copyright © 2021 Facebook. All rights reserved.
//

#import "FTReactNativeTrace.h"
#import "FtMobileAgent.h"
#import <GuanceSDK/FTMobileAgent.h>
#import <GuanceSDK/FTExternalDataManager.h>
#import <GuanceSDK/FTExternalDataManager+Private.h>
#import "FTWebSocketResourceData.h"
#import <GuanceSDK/FTResourceMetricsModel.h>
#import <GuanceSDK/FTResourceContentModel.h>
#import <React/RCTConvert.h>
#import <GuanceSDK/FTTraceManager.h>

@interface FTReactNativeTrace ()
// Keep no extra owner alive. Cancellation must not obtain a singleton after
// shutdown or depend on a WebSocket Resource having started.
@property (nonatomic, weak) id<FTExternalResourceProtocol> traceResourceDelegate;
- (nullable NSDictionary *)traceHeaderFieldsForURL:(NSString *)url key:(nullable NSString *)key;
@end

@implementation FTReactNativeTrace
RCT_EXPORT_MODULE()

RCT_REMAP_METHOD(setConfig,
                 context:(NSDictionary *)context
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self setConfig:context resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(getTraceHeaderFields,
                 url:(NSString *)url
                 key:(NSString *)key
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self getTraceHeaderFields:url key:key resolve:resolve reject:reject];
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getTraceHeaderFieldsSync:(NSString *)url
                                       key:(NSString *)key) {
  return [self traceHeaderFieldsForURL:url key:key];
}

RCT_REMAP_METHOD(cancelWebSocketTrace,
                 cancelWebSocketTrace:(NSString *)key
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject) {
  @synchronized (self) {
    FTWebSocketDiscardTraceResource(self.traceResourceDelegate, key);
  }
  resolve(nil);
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeFTReactNativeTraceSpecJSI>(params);
}
#endif
- (void)getTraceHeader:(NSString *)key url:(NSString *)url resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  [self getTraceHeaderFields:url key:key resolve:resolve reject:reject];
}

- (void)getTraceHeaderFields:(NSString *)url key:(NSString *)key resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
  NSDictionary *traceHeader = [self traceHeaderFieldsForURL:url key:key];
  if (traceHeader) {
      resolve(traceHeader);
  }else{
      resolve(nil);
  }
}

- (nullable NSDictionary *)traceHeaderFieldsForURL:(NSString *)url key:(nullable NSString *)key {
  NSURL *requestURL = [NSURL URLWithString:url];
  if (!requestURL) {
    return nil;
  }
  if (key.length > 0) {
    @synchronized (self) {
      // Use the exact delegate that creates the keyed correlation. Record it
      // before generation, including a generation that subsequently throws.
      id<FTExternalResourceProtocol> delegate = [FTExternalDataManager sharedManager].resourceDelegate;
      self.traceResourceDelegate = delegate;
      if ([delegate respondsToSelector:@selector(getTraceHeaderWithKey:url:)]) {
        return [delegate getTraceHeaderWithKey:key url:requestURL];
      }
      return nil;
    }
  }
  return [[FTExternalDataManager sharedManager] getTraceHeaderWithUrl:requestURL];
}

- (void)invalidate {
  @synchronized (self) { self.traceResourceDelegate = nil; }
}

- (void)setConfig:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  FTTraceConfig *trace = [[FTTraceConfig alloc]init];
  if ([context.allKeys containsObject:@"sampleRate"]) {
      trace.sampleRate = [RCTConvert double:context[@"sampleRate"]] * 100;
  }
  if ([context.allKeys containsObject:@"traceType"]) {
      int traceType = [RCTConvert int:context[@"traceType"]];
      trace.networkTraceType = (FTNetworkTraceType)traceType;
  }
  trace.enableLinkRumData = [RCTConvert BOOL:context[@"enableLinkRUMData"]];
  trace.enableAutoTrace = [RCTConvert BOOL:context[@"enableNativeAutoTrace"]];
  [[FTMobileAgent sharedInstance] startTraceWithConfigOptions:trace];
  resolve(nil);
}

@end
