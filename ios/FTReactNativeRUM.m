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
#pragma mark - RUM -
RCT_EXPORT_METHOD(setConfig:(NSDictionary *)arguments){
    NSString *rumAppId = [RCTConvert NSString:arguments[@"iOSAppId"]];
    if (!rumAppId) {
        return;
    }
    FTRumConfig *rumConfig = [[FTRumConfig alloc]initWithAppid:rumAppId];
    if ([arguments.allKeys containsObject:@"samplerate"]) {
        rumConfig.samplerate  = [RCTConvert double:arguments[@"samplerate"]]*100;
    }
    if ([arguments.allKeys containsObject:@"enableNativeUserAction"]) {
        rumConfig.enableTraceUserAction = [RCTConvert BOOL:arguments[@"enableNativeUserAction"]];
    }
    if ([arguments.allKeys containsObject:@"enableNativeUserView"]) {
        rumConfig.enableTraceUserView = [RCTConvert BOOL:arguments[@"enableNativeUserView"]];
    }
    if ([arguments.allKeys containsObject:@"enableNativeUserResource"]) {
        rumConfig.enableTraceUserResource = [RCTConvert BOOL:arguments[@"enableNativeUserResource"]];
    }
    if ([arguments.allKeys containsObject:@"monitorType"]) {
        rumConfig.monitorInfoType =(FTMonitorInfoType)[RCTConvert int:arguments[@"monitorType"]];
    }
    if ([arguments.allKeys containsObject:@"globalContext"]) {
        rumConfig.globalContext = [RCTConvert NSDictionary:arguments[@"globalContext"]];
    }
    [[FTMobileAgent sharedInstance] startRumWithConfigOptions:rumConfig];
}
RCT_EXPORT_METHOD(startAction:(NSString *)actionName actionType:(NSString *)actionType){
    [[FTExternalDataManager sharedManager] addActionWithName:actionName actionType:actionType];
}
RCT_EXPORT_METHOD(starView:(NSString *)viewName viewReferer:(NSString *)viewReferer){
    [[FTExternalDataManager sharedManager] startViewWithName:viewName viewReferrer:viewReferer loadDuration:@0];
}
RCT_EXPORT_METHOD(stopView){
    [[FTExternalDataManager sharedManager] stopView];
}
RCT_EXPORT_METHOD(addError:(NSString *)stack message:(NSString *)message){
    [[FTExternalDataManager sharedManager] addErrorWithType:@"reactnative" situation:AppStateUnknown message:message stack:stack];
}

RCT_EXPORT_METHOD(startResource:(NSString *)key){
    [[FTExternalDataManager sharedManager] startResourceWithKey:key];
}
RCT_EXPORT_METHOD(stopResource:(NSString *)key){
    [[FTExternalDataManager sharedManager] stopResourceWithKey:key];
}
RCT_EXPORT_METHOD(addResource:(NSString *)key metrics:(NSDictionary *)metrics content:(NSDictionary *)content){
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
}
@end
