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
        if ([context.allKeys containsObject:@"service"]) {
            config.service = [RCTConvert NSString:context[@"service"]];
        }
        if([context.allKeys containsObject:@"envType"]){
            config.env = [RCTConvert int:context[@"envType"]];
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
    [[FTMobileAgent sharedInstance] logout];
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

