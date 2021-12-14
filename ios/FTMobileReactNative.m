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

@implementation FTMobileReactNative
RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(sdkConfig:(NSString *)serverUrl arguments:(NSDictionary *)arguments){
    FTMobileConfig *config = [[FTMobileConfig alloc]initWithMetricsUrl:serverUrl];
    if ([arguments.allKeys containsObject:@"debug"]) {
        config.enableSDKDebugLog = [RCTConvert BOOL:arguments[@"debug"]];
    }
    if ([arguments.allKeys containsObject:@"datakitUUID"]) {
        config.XDataKitUUID = [RCTConvert NSString:arguments[@"datakitUUID"]];
    }
    if([arguments.allKeys containsObject:@"envType"]){
        FTEnv env = (FTEnv)[RCTConvert int:arguments[@"envType"]];
        if (env) {
            config.env = env;
        }
    }
    [FTMobileAgent startWithConfigOptions:config];
}

RCT_EXPORT_METHOD(bindUser:(NSString*)userId){
    [[FTMobileAgent sharedInstance] bindUserWithUserID:userId];
}

RCT_EXPORT_METHOD(unbindUser){
    [[FTMobileAgent sharedInstance] logout];
}
@end

