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
    if ([context.allKeys containsObject:@"samplerate"]) {
        trace.samplerate =[RCTConvert double:context[@"samplerate"]] * 100;
    }
    if ([context.allKeys containsObject:@"traceType"]) {
        int traceType = [RCTConvert int:context[@"traceType"]];
        FTNetworkTraceType type;
        switch (traceType) {
            case 0:
                type = FTNetworkTraceTypeDDtrace;
                break;
            case 1:
                type = FTNetworkTraceTypeZipkinMultiHeader;
                break;
            case 2:
                type = FTNetworkTraceTypeZipkinSingleHeader;
                break;
            case 3:
                type = FTNetworkTraceTypeTraceparent;
                break;
            case 4:
                type = FTNetworkTraceTypeSkywalking;
                break;
            case 5:
                type = FTNetworkTraceTypeJaeger;
                break;
            default:
                type = FTNetworkTraceTypeDDtrace;
                break;
        }
        trace.networkTraceType = type;
    }
    trace.enableLinkRumData = [RCTConvert BOOL:context[@"enableLinkRUMData"]];
    trace.enableAutoTrace = [RCTConvert BOOL:context[@"enableAutoTrace"]];
    [[FTMobileAgent sharedInstance] startTraceWithConfigOptions:trace];
    resolve(nil);
}

RCT_REMAP_METHOD(getTraceHeader,
                 key:(NSString *)key
                 url:(NSString *)url
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    NSDictionary *traceHeader = [[FTTraceManager sharedInstance] getTraceHeaderWithKey:key url:[NSURL URLWithString:url]];
    if (traceHeader) {
        resolve(traceHeader);
    }else{
        resolve(nil);
    }
}

@end

