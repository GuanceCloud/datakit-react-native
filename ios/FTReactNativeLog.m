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

RCT_EXPORT_METHOD(logConfig:(NSDictionary *)arguments){
    FTLoggerConfig *logger = [[FTLoggerConfig alloc]init];
    if ([arguments.allKeys containsObject:@"samplerate"]) {
        logger.samplerate  = [RCTConvert double:arguments[@"samplerate"]]*100;
    }
    if ([arguments.allKeys containsObject:@"serviceName"]) {
        logger.service = [RCTConvert NSString:arguments[@"serviceName"]];
    }
    NSArray<NSNumber *>*filters = [RCTConvert NSNumberArray:arguments[@"logLevelFilters"]];
    if (filters) {
        logger.logLevelFilter = filters;
    }
    logger.enableCustomLog = [RCTConvert BOOL:arguments[@"enableCustomLog"]];
    logger.enableLinkRumData = [RCTConvert BOOL:arguments[@"enableLinkRumData"]];
    [[FTMobileAgent sharedInstance] startLoggerWithConfigOptions:logger];
}

RCT_EXPORT_METHOD(logging:(NSString *)content status:(FTLogStatus)status){
    [[FTMobileAgent sharedInstance] logging:content status:status];
}
-(NSDictionary *)constantsToExport{
    return @{
              @"FTStatusInfo":@(FTStatusInfo),
              @"FTStatusWarning":@(FTStatusWarning),
              @"FTStatusError":@(FTStatusError),
              @"FTStatusCritical":@(FTStatusCritical),
              @"FTStatusOk":@(FTStatusOk),
    };
}
+ (BOOL)requiresMainQueueSetup
{
  return YES;
}
@end
@implementation RCTConvert (FTLog)

RCT_ENUM_CONVERTER(FTLogStatus, (@{@"FTStatusInfo":@(FTStatusInfo),
                                @"FTStatusWarning":@(FTStatusWarning),
                                @"FTStatusError":@(FTStatusError),
                                @"FTStatusCritical":@(FTStatusCritical),
                                @"FTStatusOk":@(FTStatusOk)
                              }), FTStatusInfo, integerValue)
@end
