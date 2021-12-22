//
//  FTMobileReactNative.m
//  FtMobileAgent
//
//  Created by 胡蕾蕾 on 2021/12/14.
//  Copyright © 2021 Facebook. All rights reserved.
//

#import "FTMobileReactNative.h"
#import "FtMobileAgent.h"
#import <FTMobileSDK/FTMobileAgent.h>
#import <React/RCTConvert.h>
#import <FTThreadDispatchManager.h>
@implementation FTMobileReactNative
RCT_EXPORT_MODULE()
RCT_REMAP_METHOD(sdkConfig,
                 context:(NSDictionary *)context
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
    [FTThreadDispatchManager performBlockDispatchMainSyncSafe:^{
        NSString *serverUrl = [RCTConvert NSString:context[@"serverUrl"]];
        FTMobileConfig *config = [[FTMobileConfig alloc]initWithMetricsUrl:serverUrl];
        if ([context.allKeys containsObject:@"debug"]) {
            config.enableSDKDebugLog = [RCTConvert BOOL:context[@"debug"]];
        }
        if ([context.allKeys containsObject:@"datakitUUID"]) {
            config.XDataKitUUID = [RCTConvert NSString:context[@"datakitUUID"]];
        }
        if([context.allKeys containsObject:@"envType"]){
            config.env = [RCTConvert int:context[@"envType"]];
        }
        [FTMobileAgent startWithConfigOptions:config];
        resolve(nil);
    }];
}

RCT_REMAP_METHOD(bindRUMUserData,
                 userId:(NSString*)userId
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [[FTMobileAgent sharedInstance] bindUserWithUserID:userId];
    resolve(nil);
}

RCT_REMAP_METHOD(unbindRUMUserData,
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject
                 ){
    [[FTMobileAgent sharedInstance] logout];
    resolve(nil);
}
@end

