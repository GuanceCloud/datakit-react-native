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
    if ([context.allKeys containsObject:@"samplerate"]) {
        trace.samplerate =[RCTConvert double:context[@"samplerate"]] * 100;
    }
    if ([context.allKeys containsObject:@"traceType"]) {
        trace.networkTraceType =  (FTNetworkTraceType)[RCTConvert int:context[@"traceType"]];
    }
    trace.enableLinkRumData = [RCTConvert BOOL:context[@"enableLinkRUMData"]];
    trace.enableAutoTrace = [RCTConvert BOOL:context[@"enableNativeAutoTrace"]];
    [[FTMobileAgent sharedInstance] startTraceWithConfigOptions:trace];
    resolve(nil);
}

RCT_REMAP_METHOD(getTraceHeader,
                 url:(NSString *)url
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    NSDictionary *traceHeader = [[FTExternalDataManager sharedManager] getTraceHeaderUrl:[NSURL URLWithString:url]];
    if (traceHeader) {
        resolve(traceHeader);
    }else{
        resolve(nil);
    }
}

@end

