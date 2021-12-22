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

RCT_REMAP_METHOD(setConfig,
                 context:(NSDictionary *)context
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    FTTraceConfig *trace = [[FTTraceConfig alloc]init];
    if ([context.allKeys containsObject:@"serviceName"]) {
        trace.service = [RCTConvert NSString:context[@"serviceName"]];
    }
    if ([context.allKeys containsObject:@"samplerate"]) {
        trace.samplerate =[RCTConvert double:context[@"service"]] * 100;
    }
    if ([context.allKeys containsObject:@"traceType"]) {
        trace.networkTraceType =  (FTNetworkTraceType)[RCTConvert int:context[@"traceType"]];
    }
    trace.enableLinkRumData = [RCTConvert BOOL:context[@"enableLinkRumData"]];
    trace.enableAutoTrace = [RCTConvert BOOL:context[@"enableAutoTrace"]];
    [[FTMobileAgent sharedInstance] startTraceWithConfigOptions:trace];
    resolve(nil);
}

RCT_REMAP_METHOD(getTraceHeader,
                 key:(NSString *)key url:(NSString *)url
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    NSDictionary *traceHeader = [[FTExternalDataManager sharedManager] getTraceHeaderWithKey:key url:[NSURL URLWithString:url]];
    if (traceHeader) {
        resolve(@[traceHeader]);
    }else{
        resolve(nil);
    }
}

RCT_REMAP_METHOD(addTrace,
                 resource:(NSDictionary*)resource
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    FTResourceContentModel *contentModel = [[FTResourceContentModel alloc]init];
    contentModel.httpMethod = [RCTConvert NSString:resource[@"httpMethod"]];
    contentModel.requestHeader =[RCTConvert NSDictionary:resource[@"requestHeader"]];
    contentModel.httpStatusCode = [RCTConvert int:resource[@"statusCode"]];
    contentModel.responseHeader = [RCTConvert NSDictionary:resource[@"responseHeader"]];
    contentModel.errorMessage = [RCTConvert NSString:resource[@"errorMessage"]];

    [[FTExternalDataManager sharedManager] traceWithKey:[RCTConvert NSString:resource[@"key"]] content:contentModel];
    resolve(nil);
}
@end

