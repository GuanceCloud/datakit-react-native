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
#import <FTMobileSDK/FTGlobalRumManager.h>
#import <FTMobileSDK/FTRUMManager.h>
#import <React/RCTConvert.h>
@implementation FTReactNativeRUM
RCT_EXPORT_MODULE()
RCT_REMAP_METHOD(setConfig,
                 context:(NSDictionary *)context
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    NSString *rumAppId = [RCTConvert NSString:context[@"rumAppId"]];
    FTRumConfig *rumConfig = [[FTRumConfig alloc]initWithAppid:rumAppId];
    if ([context.allKeys containsObject:@"samplerate"]) {
        rumConfig.samplerate  = [RCTConvert double:context[@"samplerate"]]*100;
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
    if ([context.allKeys containsObject:@"monitorType"]) {
        rumConfig.monitorInfoType =(FTMonitorInfoType)[RCTConvert int:context[@"monitorType"]];
    }
    if ([context.allKeys containsObject:@"globalContext"]) {
        rumConfig.globalContext = [RCTConvert NSDictionary:context[@"globalContext"]];
    }
    [[FTMobileAgent sharedInstance] startRumWithConfigOptions:rumConfig];
    resolve(nil);
}
RCT_REMAP_METHOD(startAction,
                 actionName:(NSString *)actionName actionType:(NSString *)actionType
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [FTGlobalRumManager.sharedInstance.rumManger addClickActionWithName:actionName];
    resolve(nil);
}
RCT_REMAP_METHOD(onCreateView,
                 viewName:(NSString *)viewName loadTime:(NSNumber *)loadTime
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [FTGlobalRumManager.sharedInstance.rumManger onCreateView:viewName loadTime:loadTime];
    resolve(nil);
}
RCT_REMAP_METHOD(startView,
                 viewName:(NSString *)viewName
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [FTGlobalRumManager.sharedInstance.rumManger startViewWithName:viewName];
    resolve(nil);
}
RCT_REMAP_METHOD(stopView,
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [FTGlobalRumManager.sharedInstance.rumManger stopView];
    resolve(nil);
}
RCT_REMAP_METHOD(addError,
                 stack:(NSString *)stack message:(NSString *)message
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [FTGlobalRumManager.sharedInstance.rumManger addErrorWithType:@"reactnative" message:message stack:stack];
    resolve(nil);
}

RCT_REMAP_METHOD(startResource,
                 startResource:(NSString *)key
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [FTGlobalRumManager.sharedInstance.rumManger startResource:key];
    resolve(nil);
}
RCT_REMAP_METHOD(stopResource,
                 stopResource:(NSString *)key
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [[FTExternalDataManager sharedManager] stopResourceWithKey:key];
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
