//
//  FTReactNativeRUM.m
//  FtMobileAgent
//
//  Created by 胡蕾蕾 on 2021/12/14.
//  Copyright © 2021 Facebook. All rights reserved.
//

#import "FTReactNativeRUM.h"
#import <FTMobileSDK/FTMobileAgent.h>
#import <FTMobileSDK/FTExternalDataManager.h>
#import <FTMobileSDK/FTResourceMetricsModel.h>
#import <FTMobileSDK/FTResourceContentModel.h>
#import <React/RCTConvert.h>
BOOL filterBlackResource(NSURL *url){
    static NSMutableArray *internalDevResourceBlacklist;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        internalDevResourceBlacklist = [NSMutableArray new];
        NSError *error = nil;
        NSString *pattern = @"^http://((10|172|192).[0-9]+.[0-9]+.[0-9]+|localhost|127.0.0.1):808[0-9]/logs$";
        NSRegularExpression * regularExpress = [NSRegularExpression regularExpressionWithPattern:pattern options:NSRegularExpressionCaseInsensitive error:&error];
        [internalDevResourceBlacklist addObject:regularExpress];
        NSString *rn = @"^http://localhost:808[0-9]/(hot|symbolicate|message|inspector|status|assets).*$";
        NSRegularExpression * rnRegularExpress = [NSRegularExpression regularExpressionWithPattern:rn options:NSRegularExpressionCaseInsensitive error:&error];
        [internalDevResourceBlacklist addObject:rnRegularExpress];
    });
    for (NSRegularExpression *regex in internalDevResourceBlacklist) {
        NSTextCheckingResult *firstMatch =[regex firstMatchInString:url.absoluteString options:0 range:NSMakeRange(0, [url.absoluteString length])];
        if (firstMatch) {
            return YES;
        }
    }
    return NO;
}
@implementation FTReactNativeRUM
RCT_EXPORT_MODULE()
RCT_REMAP_METHOD(setConfig,
                 context:(NSDictionary *)context
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  NSString *rumAppId = [RCTConvert NSString:context[@"iOSAppId"]];
  FTRumConfig *rumConfig = [[FTRumConfig alloc]initWithAppid:rumAppId];
  if ([context.allKeys containsObject:@"sampleRate"]) {
    rumConfig.samplerate  = [RCTConvert double:context[@"sampleRate"]]*100;
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
    rumConfig.rumDiscardType = [RCTConvert int:context[@"rumDiscardStrategy"]];
  }
  if ([context.allKeys containsObject:@"rumCacheLimitCount"]) {
    rumConfig.rumCacheLimitCount = [RCTConvert int:context[@"rumCacheLimitCount"]];
  }
#if DEBUG
  rumConfig.resourceUrlHandler = ^BOOL(NSURL * _Nonnull url) {
    return filterBlackResource(url);
  };
#endif
  [[FTMobileAgent sharedInstance] startRumWithConfigOptions:rumConfig];
  resolve(nil);
}
RCT_REMAP_METHOD(startAction,
                 actionName:(NSString *)actionName actionType:(NSString *)actionType property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [[FTExternalDataManager sharedManager] startAction:actionName actionType:actionType property:property];
  resolve(nil);
}
RCT_REMAP_METHOD(addAction,
                 addAction:(NSString *)actionName actionType:(NSString *)actionType property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [[FTExternalDataManager sharedManager] addAction:actionName actionType:actionType property:property];
  resolve(nil);
}
RCT_REMAP_METHOD(onCreateView,
                  viewName:(NSString *)viewName loadTime:(double)loadTime
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [[FTExternalDataManager sharedManager] onCreateView:viewName loadTime:@(loadTime)];
    resolve(nil);
}
RCT_REMAP_METHOD(startView,
                  viewName:(NSString *)viewName property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [[FTExternalDataManager sharedManager] startViewWithName:viewName property:property];
    resolve(nil);
}
RCT_REMAP_METHOD(stopView,
                 property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [[FTExternalDataManager sharedManager] stopViewWithProperty:property];
    resolve(nil);
}
RCT_REMAP_METHOD(addError,
                 stack:(NSString *)stack message:(NSString *)message property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [[FTExternalDataManager sharedManager] addErrorWithType:@"reactnative_crash" message:message stack:stack property:property];
    resolve(nil);
}
RCT_REMAP_METHOD(addErrorWithType,
                 type:(NSString *)type stack:(NSString *)stack message:(NSString *)message property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [[FTExternalDataManager sharedManager] addErrorWithType:type message:message stack:stack property:property];
    resolve(nil);
}
RCT_REMAP_METHOD(startResource,
                 startResource:(NSString *)key property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [[FTExternalDataManager sharedManager] startResourceWithKey:key property:property];
    resolve(nil);
}
RCT_REMAP_METHOD(stopResource,
                 stopResource:(NSString *)key property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [[FTExternalDataManager sharedManager] stopResourceWithKey:key property:property];
    resolve(nil);
}
RCT_REMAP_METHOD(addResource,
                 addResource:(NSString *)key content:(NSDictionary *)content metrics:(NSDictionary *)metrics
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
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
@end
