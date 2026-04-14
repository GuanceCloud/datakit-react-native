//
//  FTReactNativeLog.m
//  FtMobileAgent
//
//  Created by Hu Leilei on 2021/12/14.
//  Copyright © 2021 Facebook. All rights reserved.
//

#import "FTReactNativeLog.h"
#import <FTMobileSDK/FTMobileAgent.h>
#import <React/RCTConvert.h>
#import <FTMobileSDK/FTLogger+Private.h>
@implementation FTReactNativeLog
RCT_EXPORT_MODULE()

RCT_REMAP_METHOD(logConfig,
                 context:(NSDictionary *)context
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self logConfig:context resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(logging,
                 logging:(NSString *)content status:(nonnull NSNumber *)status property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  
  [self logging:content logStatus:[status doubleValue] property:property resolve:resolve reject:reject];

}
RCT_REMAP_METHOD(logWithStatusString,
                 logWithStatusString:(NSString *)content status:(NSString *)status property:(NSDictionary *)property
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self logWithStatusString:content logStatus:status property:property resolve:resolve reject:reject];
}
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeFTReactNativeLogSpecJSI>(params);
}
#endif

- (void)logConfig:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  FTLoggerConfig *logger = [[FTLoggerConfig alloc]init];
  if ([context.allKeys containsObject:@"sampleRate"]) {
      logger.samplerate  = [RCTConvert double:context[@"sampleRate"]]*100;
  }
  NSArray<NSNumber *>*filters = [RCTConvert NSNumberArray:context[@"logLevelFilters"]];
  if (filters) {
      logger.logLevelFilter = filters;
  }
  if([context.allKeys containsObject:@"discardStrategy"]){
      logger.discardType = (FTLogCacheDiscard)[RCTConvert int:context[@"discardStrategy"]];
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

- (void)logWithStatusString:(NSString *)content logStatus:(NSString *)logStatus property:(NSDictionary *)property resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
  [[FTLogger sharedInstance] log:content status:logStatus property:property];
  resolve(nil);
}

- (void)logging:(NSString *)content logStatus:(double)logStatus property:(NSDictionary *)property resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
  FTLogStatus status =(FTLogStatus)logStatus;
  [[FTLogger sharedInstance] log:content statusType:status property:property];
  resolve(nil);
}

@end

