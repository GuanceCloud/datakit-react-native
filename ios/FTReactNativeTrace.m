//
//  FTReactNativeTrace.m
//  FtMobileAgent
//
//  Created by 胡蕾蕾 on 2021/12/14.
//  Copyright © 2021 Facebook. All rights reserved.
//

#import "FTReactNativeTrace.h"
#import "FtMobileAgent.h"
#import <FTMobileSDK/FTMobileAgent.h>
#import <FTMobileSDK/FTExternalDataManager.h>
#import <FTMobileSDK/FTResourceMetricsModel.h>
#import <FTMobileSDK/FTResourceContentModel.h>
#import <React/RCTConvert.h>
@implementation FTReactNativeTrace
RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(setConfig:(NSDictionary *)arguments){
    FTTraceConfig *trace = [[FTTraceConfig alloc]init];
    if ([arguments.allKeys containsObject:@"serviceName"]) {
        trace.service = [RCTConvert NSString:arguments[@"serviceName"]];
    }
    if ([arguments.allKeys containsObject:@"samplerate"]) {
        trace.samplerate =[RCTConvert double:arguments[@"service"]] * 100;
    }
    if ([arguments.allKeys containsObject:@"traceType"]) {
        FTNetworkTraceType type = (FTNetworkTraceType)[RCTConvert int:arguments[@"traceType"]];
        if (type) {
            trace.networkTraceType = type;
        }
    }
    trace.enableLinkRumData = [RCTConvert BOOL:arguments[@"enableLinkRumData"]];
    trace.enableAutoTrace = [RCTConvert BOOL:arguments[@"enableAutoTrace"]];
    [[FTMobileAgent sharedInstance] startTraceWithConfigOptions:trace];
}

RCT_EXPORT_METHOD(getTraceHeader:(NSString *)key url:(NSString *)url callback:(RCTResponseSenderBlock)callback){
    NSDictionary *traceHeader = [[FTExternalDataManager sharedManager] getTraceHeaderWithKey:key url:[NSURL URLWithString:url]];
    if (traceHeader) {
        callback(@[traceHeader]);
    }else{
        callback(nil);
    }
}

RCT_EXPORT_METHOD(addTrace:(NSString *)key httpMethod:(NSString *)httpMethod requestHeader:(NSDictionary *)requestHeader arguments:(NSDictionary *)arguments){
    
    FTResourceContentModel *contentModel = [[FTResourceContentModel alloc]init];
    contentModel.httpMethod = httpMethod;
    contentModel.requestHeader = requestHeader;
    contentModel.responseHeader = [RCTConvert NSDictionary:arguments[@"responseHeader"]];
    contentModel.errorMessage = [RCTConvert NSString:arguments[@"errorMessage"]];
    contentModel.httpStatusCode = [RCTConvert int:arguments[@"resourceStatus"]];
    [[FTExternalDataManager sharedManager] traceWithKey:key content:contentModel];
}
@end

