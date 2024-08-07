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
        FTMobileConfig *config;
        NSString *datakitUrl = [RCTConvert NSString:context[@"datakitUrl"]];
        NSString *dataWayUrl = [RCTConvert NSString:context[@"datawayUrl"]];
        NSString *clientToken = [RCTConvert NSString:context[@"clientToken"]];
        if(dataWayUrl && dataWayUrl.length>0 && clientToken && clientToken.length>0){
            config = [[FTMobileConfig alloc]initWithDatawayUrl:dataWayUrl clientToken:clientToken];
        }else if(datakitUrl && datakitUrl.length>0){
            config = [[FTMobileConfig alloc]initWithDatakitUrl:datakitUrl];
        }else{
            resolve(nil);
            return;
        }
        if ([context.allKeys containsObject:@"debug"]) {
            config.enableSDKDebugLog = [RCTConvert BOOL:context[@"debug"]];
        }
        if ([context.allKeys containsObject:@"service"]) {
            config.service = [RCTConvert NSString:context[@"service"]];
        }
        if([context.allKeys containsObject:@"env"]){
            id env = context[@"env"];
            if([env isKindOfClass:NSString.class]){
                config.env = env;
            }
        }
         if([context.allKeys containsObject:@"envType"]){
            id env = context[@"envType"];
            if([env isKindOfClass:NSNumber.class]){
                int envType = [env intValue];
                if(envType>=0 && envType<5){
                    [config setEnvWithType:envType];
                }
            }
        }
        if ([context.allKeys containsObject:@"autoSync"]) {
            config.autoSync = [RCTConvert BOOL:context[@"autoSync"]];
        }
        if ([context.allKeys containsObject:@"syncPageSize"]) {
            config.syncPageSize = [RCTConvert int:context[@"syncPageSize"]];
        }
        if ([context.allKeys containsObject:@"syncSleepTime"]) {
            config.syncSleepTime = [RCTConvert int:context[@"syncSleepTime"]];
        }
        if ([context.allKeys containsObject:@"enableDataIntegerCompatible"]) {
            config.enableDataIntegerCompatible = [RCTConvert BOOL:context[@"enableDataIntegerCompatible"]];
        }
        if ([context.allKeys containsObject:@"globalContext"]) {
            config.globalContext = [RCTConvert NSDictionary:context[@"globalContext"]];
        }
        if ([context.allKeys containsObject:@"groupIdentifiers"]){
            config.groupIdentifiers = [RCTConvert NSArray:context[@"groupIdentifiers"]];
        }
        [FTMobileAgent startWithConfigOptions:config];
        resolve(nil);
    }];
}

RCT_REMAP_METHOD(bindRUMUserData,
                  userId:(NSString*)userId userName:(NSString*)userName userEmail:(NSString*)userEmail extra:(NSDictionary *)extra
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [[FTMobileAgent sharedInstance] bindUserWithUserID:userId userName:userName userEmail:userEmail extra:extra];
    resolve(nil);
}

RCT_REMAP_METHOD(unbindRUMUserData,
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject
                 ){
    [[FTMobileAgent sharedInstance] unbindUser];
    resolve(nil);
}

RCT_REMAP_METHOD(trackEventFromExtension,
                 identifier:(NSString*)identifier
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [[FTMobileAgent sharedInstance] trackEventFromExtensionWithGroupIdentifier:identifier completion:^(NSString * _Nonnull groupIdentifier, NSArray * _Nonnull events) {
        if(events.count>0){
            resolve(@{@"groupIdentifier":identifier,
                      @"datas":events
                    });
        }else{
            resolve(nil);
        }
        
    }];
}
@end

