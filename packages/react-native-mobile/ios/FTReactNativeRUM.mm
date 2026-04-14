//
//  FTReactNativeRUM.m
//  FtMobileAgent
//
//  Created by Hu Leilei on 2021/12/14.
//  Copyright © 2021 Facebook. All rights reserved.
//

#import "FTReactNativeRUM.h"
#import <FTMobileSDK/FTMobileAgent.h>
#import <FTMobileSDK/FTExternalDataManager.h>
#import <FTMobileSDK/FTResourceMetricsModel.h>
#import <FTMobileSDK/FTResourceContentModel.h>
#import <React/RCTConvert.h>
#import "FTReactNativeUtils.h"

@implementation FTReactNativeRUM
RCT_EXPORT_MODULE()
RCT_REMAP_METHOD(setConfig,
                 context:(NSDictionary *)context
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self setConfig:context resolve:resolve reject:reject];
}
RCT_REMAP_METHOD(startAction,
                 actionName:(NSString *)actionName actionType:(NSString *)actionType property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self startAction:actionName actionType:actionType property:property resolve:resolve reject:reject];
}
RCT_REMAP_METHOD(addAction,
                 addAction:(NSString *)actionName actionType:(NSString *)actionType property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self addAction:actionName actionType:actionType property:property resolve:resolve reject:reject];
}
RCT_REMAP_METHOD(onCreateView,
                  viewName:(NSString *)viewName loadTime:(double)loadTime
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self onCreateView:viewName loadTime:loadTime resolve:resolve reject:reject];
}
RCT_REMAP_METHOD(startView,
                  viewName:(NSString *)viewName property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self startView:viewName property:property resolve:resolve reject:reject];
}
RCT_REMAP_METHOD(stopView,
                 property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self stopView:property resolve:resolve reject:reject];
}
RCT_REMAP_METHOD(addError,
                 stack:(NSString *)stack message:(NSString *)message property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self addError:stack message:message property:property resolve:resolve reject:reject];
}
RCT_REMAP_METHOD(addErrorWithType,
                 type:(NSString *)type stack:(NSString *)stack message:(NSString *)message property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self addErrorWithType:type stack:stack message:message property:property resolve:resolve reject:reject];
}
RCT_REMAP_METHOD(startResource,
                 startResource:(NSString *)key property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self startResource:key property:property resolve:resolve reject:reject];
}
RCT_REMAP_METHOD(stopResource,
                 stopResource:(NSString *)key property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self stopResource:key property:property resolve:resolve reject:reject];
}
RCT_REMAP_METHOD(addResource,
                 addResource:(NSString *)key content:(NSDictionary *)content metrics:(NSDictionary *)metrics
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self addResource:key resource:content metrics:metrics resolve:resolve reject:reject];
}
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeFTReactNativeRUMSpecJSI>(params);
}
#endif

- (void)addAction:(NSString *)actionName actionType:(NSString *)actionType property:(NSDictionary *)property resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
  [[FTExternalDataManager sharedManager] addAction:actionName actionType:actionType property:property];
  resolve(nil);
}

- (void)addError:(NSString *)stack message:(NSString *)message property:(NSDictionary *)property resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
  [[FTExternalDataManager sharedManager] addErrorWithType:@"reactnative_crash" message:message stack:stack property:property];
  resolve(nil);
}

- (void)addErrorWithType:(NSString *)type stack:(NSString *)stack message:(NSString *)message property:(NSDictionary *)property resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
  [[FTExternalDataManager sharedManager] addErrorWithType:type message:message stack:stack property:property];
  resolve(nil);
}

- (void)addResource:(NSString *)key resource:(NSDictionary *)content metrics:(NSDictionary *)metrics resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
  if (key.length==0 || content.allKeys.count == 0) {
      return;
  }
  FTResourceMetricsModel *metricsModel = nil;
  if (metrics.allKeys.count>0) {
      metricsModel = [[FTResourceMetricsModel alloc]init];
      metricsModel.duration = [RCTConvert NSNumber:metrics[@"duration"]];
      metricsModel.resource_dns = [RCTConvert NSNumber:metrics[@"resource_dns"]];
      metricsModel.resource_tcp = [RCTConvert NSNumber:metrics[@"resource_tcp"]];
      metricsModel.resource_ssl = [RCTConvert NSNumber:metrics[@"resource_ssl"]];
      metricsModel.resource_ttfb = [RCTConvert NSNumber:metrics[@"resource_ttfb"]];
      metricsModel.resource_trans = [RCTConvert NSNumber:metrics[@"resource_trans"]];
      metricsModel.resource_first_byte = [RCTConvert NSNumber:metrics[@"resource_first_byte"]];
  }
  FTResourceContentModel *contentModel = [[FTResourceContentModel alloc]init];
  contentModel.url = [RCTConvert NSURL:content[@"url"]];
  contentModel.httpMethod = [RCTConvert NSString:content[@"httpMethod"]];
  contentModel.requestHeader = [RCTConvert NSDictionary:content[@"requestHeader"]];
  contentModel.responseHeader = [RCTConvert NSDictionary:content[@"responseHeader"]];
  contentModel.responseBody = [RCTConvert NSString:content[@"responseBody"]];
  contentModel.httpStatusCode = [RCTConvert int:content[@"resourceStatus"]];

  [[FTExternalDataManager sharedManager] addResourceWithKey:key metrics:metricsModel content:contentModel];
  resolve(nil);
}

- (void)onCreateView:(NSString *)viewName loadTime:(double)loadTime resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
  [[FTExternalDataManager sharedManager] onCreateView:viewName loadTime:@(loadTime)];
  resolve(nil);
}

- (void)setConfig:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  NSString *rumAppId = [RCTConvert NSString:context[@"iOSAppId"]];
  FTRumConfig *rumConfig = [[FTRumConfig alloc]initWithAppid:rumAppId];
  if ([context.allKeys containsObject:@"sampleRate"]) {
    rumConfig.samplerate  = [RCTConvert double:context[@"sampleRate"]]*100;
  }
  if ([context.allKeys containsObject:@"sessionOnErrorSampleRate"]) {
    rumConfig.sessionOnErrorSampleRate  = [RCTConvert double:context[@"sessionOnErrorSampleRate"]]*100;
  }
  if ([context.allKeys containsObject:@"enableNativeUserAction"]) {
    rumConfig.enableTraceUserAction = [RCTConvert BOOL:context[@"enableNativeUserAction"]];
  }
  if ([context.allKeys containsObject:@"enableNativeUserView"]) {
    rumConfig.enableTraceUserView = [RCTConvert BOOL:context[@"enableNativeUserView"]];
  }
  if ([context.allKeys containsObject:@"enableNativeUserResource"]) {
    rumConfig.enableTraceUserResource = [RCTConvert BOOL:context[@"enableNativeUserResource"]];
  }
  if ([context.allKeys containsObject:@"errorMonitorType"]) {
    rumConfig.errorMonitorType =(FTErrorMonitorType)[RCTConvert int:context[@"errorMonitorType"]];
  }
  if ([context.allKeys containsObject:@"deviceMonitorType"]) {
    rumConfig.deviceMetricsMonitorType =(FTDeviceMetricsMonitorType)[RCTConvert int:context[@"deviceMonitorType"]];
  }
  if ([context.allKeys containsObject:@"detectFrequency"]) {
    rumConfig.monitorFrequency =(FTMonitorFrequency)[RCTConvert int:context[@"detectFrequency"]];
  }
  if ([context.allKeys containsObject:@"enableResourceHostIP"]) {
    rumConfig.enableResourceHostIP = [RCTConvert BOOL:context[@"enableResourceHostIP"]];
  }
  if ([context.allKeys containsObject:@"enableTrackNativeCrash"]){
    rumConfig.enableTrackAppCrash = [RCTConvert BOOL:context[@"enableTrackNativeCrash"]];
  }
  if ([context.allKeys containsObject:@"enableTrackNativeAppANR"]){
    rumConfig.enableTrackAppANR = [RCTConvert BOOL:context[@"enableTrackNativeAppANR"]];
  }
  if ([context.allKeys containsObject:@"enableTrackNativeFreeze"]){
    rumConfig.enableTrackAppFreeze = [RCTConvert BOOL:context[@"enableTrackNativeFreeze"]];
  }
  if ([context.allKeys containsObject:@"nativeFreezeDurationMs"]){
    rumConfig.freezeDurationMs = [RCTConvert double:context[@"nativeFreezeDurationMs"]];
  }
  if ([context.allKeys containsObject:@"globalContext"]) {
    rumConfig.globalContext = [RCTConvert NSDictionary:context[@"globalContext"]];
  }
  if ([context.allKeys containsObject:@"rumDiscardStrategy"]) {
    rumConfig.rumDiscardType = (FTRUMCacheDiscard)[RCTConvert int:context[@"rumDiscardStrategy"]];
  }
  if ([context.allKeys containsObject:@"rumCacheLimitCount"]) {
    rumConfig.rumCacheLimitCount = [RCTConvert int:context[@"rumCacheLimitCount"]];
  }
  if ([context.allKeys containsObject:@"enableTraceWebView"]) {
    rumConfig.enableTraceWebView = [RCTConvert BOOL:context[@"enableTraceWebView"]];
  }
  if ([context.allKeys containsObject:@"allowWebViewHost"]) {
    rumConfig.allowWebViewHost = [RCTConvert NSArray:context[@"allowWebViewHost"]];
  }
  if ([context.allKeys containsObject:@"iosCrashMonitoringType"]) {
    rumConfig.crashMonitoring = (FTCrashMonitorType)[RCTConvert int:context[@"iosCrashMonitoringType"]];
  }
#if DEBUG
  rumConfig.resourceUrlHandler = ^BOOL(NSURL * _Nonnull url) {
    return [FTReactNativeUtils filterBlackResource:url];
  };
#endif
  [[FTMobileAgent sharedInstance] startRumWithConfigOptions:rumConfig];
  resolve(nil);
}

- (void)startAction:(NSString *)actionName actionType:(NSString *)actionType property:(NSDictionary *)property resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
  [[FTExternalDataManager sharedManager] startAction:actionName actionType:actionType property:property];
  resolve(nil);
}

- (void)startResource:(NSString *)key property:(NSDictionary *)property resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
  [[FTExternalDataManager sharedManager] startResourceWithKey:key property:property];
  resolve(nil);
}

- (void)startView:(NSString *)viewName property:(NSDictionary *)property resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
  [[FTExternalDataManager sharedManager] startViewWithName:viewName property:property];
  resolve(nil);
}

- (void)stopResource:(NSString *)key property:(NSDictionary *)property resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
  [[FTExternalDataManager sharedManager] stopResourceWithKey:key property:property];
  resolve(nil);
}

- (void)stopView:(NSDictionary *)property resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
  [[FTExternalDataManager sharedManager] stopViewWithProperty:property];
  resolve(nil);
}

@end
