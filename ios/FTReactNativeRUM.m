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
    if ([context.allKeys containsObject:@"globalContext"]) {
        rumConfig.globalContext = [RCTConvert NSDictionary:context[@"globalContext"]];
    }
    [[FTMobileAgent sharedInstance] startRumWithConfigOptions:rumConfig];
    resolve(nil);
}
RCT_REMAP_METHOD(startAction,
                 actionName:(NSString *)actionName actionType:(NSString *)actionType property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [[FTExternalDataManager sharedManager] addActionName:actionName actionType:actionType property:property];
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
    [[FTExternalDataManager sharedManager] addErrorWithType:@"reactnative" message:message stack:stack property:property];
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
