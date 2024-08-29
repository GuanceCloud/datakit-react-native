//
//  FTReactNativeLog.m
//  FtMobileAgent
//
//  Created by 胡蕾蕾 on 2021/12/14.
//  Copyright © 2021 Facebook. All rights reserved.
//

#import "FTReactNativeLog.h"
#import <FTMobileSDK/FTMobileAgent.h>
#import <React/RCTConvert.h>
@implementation FTReactNativeLog
RCT_EXPORT_MODULE()

RCT_REMAP_METHOD(logConfig,
                 context:(NSDictionary *)context
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    FTLoggerConfig *logger = [[FTLoggerConfig alloc]init];
    if ([context.allKeys containsObject:@"sampleRate"]) {
        logger.samplerate  = [RCTConvert double:context[@"sampleRate"]]*100;
    }
    NSArray<NSNumber *>*filters = [RCTConvert NSNumberArray:context[@"logLevelFilters"]];
    if (filters) {
        logger.logLevelFilter = filters;
    }
    if([context.allKeys containsObject:@"discardStrategy"]){
        logger.discardType = [RCTConvert int:context[@"discardStrategy"]];
    }
    if ([context.allKeys containsObject:@"globalContext"]) {
        logger.globalContext = [RCTConvert NSDictionary:context[@"globalContext"]];
    }
    logger.enableCustomLog = [RCTConvert BOOL:context[@"enableCustomLog"]];
    logger.enableLinkRumData = [RCTConvert BOOL:context[@"enableLinkRumData"]];
    if ([context.allKeys containsObject:@"logCacheLimitCount"]) {
            logger.logCacheLimitCount = [RCTConvert int:context[@"logCacheLimitCount"]];
    }
    [[FTMobileAgent sharedInstance] startLoggerWithConfigOptions:logger];
    resolve(nil);
}

RCT_REMAP_METHOD(logging,
                 logging:(NSString *)content status:(nonnull NSNumber *)status property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
   
    FTLogStatus logStatus =(FTLogStatus)[status integerValue];
    [[FTMobileAgent sharedInstance] logging:content status:logStatus property:property];
    resolve(nil);
}
RCT_REMAP_METHOD(logWithStatusString,
                 logWithStatusString:(NSString *)content status:(NSString *)status property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [[FTLogger sharedInstance] log:content status:status property:property];
    resolve(nil);
}
@end

