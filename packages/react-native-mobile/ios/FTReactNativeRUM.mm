//
//  FTReactNativeRUM.m
//  FtMobileAgent
//
//  Created by Hu Leilei on 2021/12/14.
//  Copyright © 2021 Facebook. All rights reserved.
//

#import "FTReactNativeRUM.h"
#import <GuanceSDK/FTMobileAgent.h>
#import <GuanceSDK/FTExternalDataManager.h>
#import <GuanceSDK/FTResourceMetricsModel.h>
#import <GuanceSDK/FTResourceContentModel.h>
#import <React/RCTConvert.h>
#import <React/RCTBridge.h>
#import <UIKit/UIKit.h>
#import "FTReactNativeUtils.h"
#import "FTJSLongTaskMonitor.h"

@interface FTReactNativeRUM ()
@property (nonatomic, strong, nullable) FTJSLongTaskMonitor *jsLongTaskMonitor;
@end

@implementation FTReactNativeRUM
@synthesize bridge = _bridge;
RCT_EXPORT_MODULE()
RCT_REMAP_METHOD(setConfig,
                 context:(NSDictionary *)context
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self setConfig:context resolve:resolve reject:reject];
}
RCT_REMAP_METHOD(stopLongTaskTracking,
                 stopLongTaskTrackingWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self stopLongTaskTracking:resolve reject:reject];
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

- (instancetype)init {
  self = [super init];
  if (self) {
    [[NSNotificationCenter defaultCenter]
      addObserver:self
      selector:@selector(applicationDidBecomeActive:)
      name:UIApplicationDidBecomeActiveNotification
      object:nil];
    [[NSNotificationCenter defaultCenter]
      addObserver:self
      selector:@selector(applicationWillResignActive:)
      name:UIApplicationWillResignActiveNotification
      object:nil];
  }
  return self;
}

- (void)invalidate {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  [self.jsLongTaskMonitor disableWithCompletion:nil];
}

- (void)dealloc {
  [[NSNotificationCenter defaultCenter] removeObserver:self];
  [_jsLongTaskMonitor disableWithCompletion:nil];
}

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
    rumConfig.sampleRate = [RCTConvert double:context[@"sampleRate"]] * 100;
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
  BOOL enableLongTask = [RCTConvert BOOL:context[@"enableLongTask"]];
  double configuredLongTaskThresholdMs = [context.allKeys containsObject:@"longTaskThresholdMs"]
    ? [RCTConvert double:context[@"longTaskThresholdMs"]]
    : 100;
  double longTaskThresholdMs = enableLongTask ? configuredLongTaskThresholdMs : 0;
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
  if (self.jsLongTaskMonitor == nil) {
    self.jsLongTaskMonitor = [FTJSLongTaskMonitor monitorWithBridge:self.bridge];
  }
  [self.jsLongTaskMonitor setThresholdMilliseconds:longTaskThresholdMs];
  if (longTaskThresholdMs > 0 && [self applicationIsActive]) {
    [self.jsLongTaskMonitor start];
  } else {
    [self.jsLongTaskMonitor stop];
  }
  resolve(nil);
}

- (void)stopLongTaskTracking:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  if (self.jsLongTaskMonitor == nil) {
    resolve(nil);
    return;
  }
  [self.jsLongTaskMonitor disableWithCompletion:^{
    resolve(nil);
  }];
}

- (void)applicationDidBecomeActive:(NSNotification *)notification {
  [self.jsLongTaskMonitor start];
}

- (void)applicationWillResignActive:(NSNotification *)notification {
  [self.jsLongTaskMonitor stop];
}

- (BOOL)applicationIsActive {
  __block BOOL active = NO;
  dispatch_block_t readState = ^{
    active = UIApplication.sharedApplication.applicationState == UIApplicationStateActive;
  };
  if (NSThread.isMainThread) {
    readState();
  } else {
    dispatch_sync(dispatch_get_main_queue(), readState);
  }
  return active;
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
