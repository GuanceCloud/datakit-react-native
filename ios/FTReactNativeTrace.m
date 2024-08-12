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
#import <FTMobileSDK/FTTraceManager.h>
@implementation FTReactNativeTrace
RCT_EXPORT_MODULE()

RCT_REMAP_METHOD(setConfig,
                 context:(NSDictionary *)context
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    FTTraceConfig *trace = [[FTTraceConfig alloc]init];
    if ([context.allKeys containsObject:@"sampleRate"]) {
        trace.samplerate =[RCTConvert double:context[@"sampleRate"]] * 100;
    }
    if ([context.allKeys containsObject:@"traceType"]) {
        int traceType = [RCTConvert int:context[@"traceType"]];
        trace.networkTraceType = traceType;
    }
    trace.enableLinkRumData = [RCTConvert BOOL:context[@"enableLinkRUMData"]];
    trace.enableAutoTrace = [RCTConvert BOOL:context[@"enableNativeAutoTrace"]];
    [[FTMobileAgent sharedInstance] startTraceWithConfigOptions:trace];
    resolve(nil);
}

RCT_REMAP_METHOD(getTraceHeaderFields,
                 url:(NSString *)url
                 key:(NSString *)key
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
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

@end

