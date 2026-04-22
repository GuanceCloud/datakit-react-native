//
//  FTReactNativeTrace.m
//  FtMobileAgent
//
//  Created by Hu Leilei on 2021/12/14.
//  Copyright © 2021 Facebook. All rights reserved.
//

#import "FTReactNativeTrace.h"
#import "FtMobileAgent.h"
#import <FTMobileSDK/FTMobileAgent.h>
#import <FTMobileSDK/FTExternalDataManager.h>
#import <FTMobileSDK/FTResourceMetricsModel.h>
#import <FTMobileSDK/FTResourceContentModel.h>
#import <React/RCTConvert.h>
#import <FTMobileSDK/FTTraceManager.h>
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

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeFTReactNativeTraceSpecJSI>(params);
}
#endif
- (void)getTraceHeader:(NSString *)key url:(NSString *)url resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  [self getTraceHeaderFields:url key:key resolve:resolve reject:reject];
}

- (void)getTraceHeaderFields:(NSString *)url key:(NSString *)key resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
  NSDictionary *traceHeader = nil;
  if(key&&key.length>0){
      traceHeader = [[FTExternalDataManager sharedManager] getTraceHeaderWithKey:key url:[NSURL URLWithString:url]];
  }else{
      traceHeader = [[FTExternalDataManager sharedManager] getTraceHeaderWithUrl:[NSURL URLWithString:url]];
  }
  if (traceHeader) {
      resolve(traceHeader);
  }else{
      resolve(nil);
  }
}

- (void)setConfig:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  FTTraceConfig *trace = [[FTTraceConfig alloc]init];
  if ([context.allKeys containsObject:@"sampleRate"]) {
      trace.samplerate =[RCTConvert double:context[@"sampleRate"]] * 100;
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

