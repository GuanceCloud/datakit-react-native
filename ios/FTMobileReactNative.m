//
//  FTMobileReactNative.m
//  FtMobileAgent
//
//  Created by Hu Leilei on 2021/12/14.
//  Copyright © 2021 Facebook. All rights reserved.
//

#import "FTMobileReactNative.h"
#import <FTMobileSDK/FTMobileAgent.h>
#import <FTMobileSDK/FTMobileConfig+Private.h>
#import <React/RCTConvert.h>
#import <FTMobileSDK/FTThreadDispatchManager.h>
#import <FTMobileSDK/FTConstants.h>

static NSString *const FTRemoteConfigCallbackEvent = @"ft_remote_config_callback";

@implementation FTMobileReactNative
{
  BOOL _hasListeners;
  BOOL _remoteConfigurationEnabled;
  int _remoteConfigMiniUpdateInterval;
  NSArray<NSDictionary *> *_remoteConfigOverrideRules;
}

RCT_EXPORT_MODULE()

- (NSArray<NSString *> *)supportedEvents
{
  return @[FTRemoteConfigCallbackEvent];
}

- (void)startObserving
{
  _hasListeners = YES;
}

- (void)stopObserving
{
  _hasListeners = NO;
}

- (NSDictionary *)remoteConfigResultWithSuccess:(BOOL)success
                                        content:(NSDictionary<NSString *, id> *_Nullable)content
                                          error:(NSError *_Nullable)error
                               appliedRuleIds:(NSArray<NSString *> *_Nullable)appliedRuleIds
                                    triggerType:(NSString *)triggerType
{
  NSMutableDictionary *payload = [NSMutableDictionary dictionary];
  payload[@"triggerType"] = triggerType;
  payload[@"success"] = @(success);
  payload[@"platform"] = @"ios";
  payload[@"timestamp"] = @((long long)([[NSDate date] timeIntervalSince1970] * 1000));
  if (content) {
    payload[@"content"] = content;
  }
  if (appliedRuleIds.count > 0) {
    payload[@"appliedOverrideRuleIds"] = appliedRuleIds;
  }
  if (error) {
    payload[@"errorCode"] = @(error.code);
    payload[@"errorMessage"] = error.localizedDescription ?: @"";
  }
  return payload;
}

- (void)emitAutoRemoteConfigEventWithSuccess:(BOOL)success
                                     content:(NSDictionary<NSString *, id> *_Nullable)content
                              appliedRuleIds:(NSArray<NSString *> *_Nullable)appliedRuleIds
                                       error:(NSError *_Nullable)error
{
  if (!_hasListeners) {
    return;
  }
  [self sendEventWithName:FTRemoteConfigCallbackEvent
                     body:[self remoteConfigResultWithSuccess:success
                                                     content:content
                                               appliedRuleIds:appliedRuleIds
                                                       error:error
                                                 triggerType:@"auto"]];
}

- (NSArray<NSString *> *)applyRemoteConfigOverrideRulesWithModel:(FTRemoteConfigModel *_Nullable)model
                                                         content:(NSDictionary<NSString *, id> *_Nullable)content
{
  if (!model || !content || _remoteConfigOverrideRules.count == 0) {
    return @[];
  }
  NSMutableArray<NSString *> *appliedRuleIds = [NSMutableArray array];
  [_remoteConfigOverrideRules enumerateObjectsUsingBlock:^(NSDictionary * _Nonnull rule, NSUInteger idx, BOOL * _Nonnull stop) {
    BOOL enabled = ![rule.allKeys containsObject:@"enabled"] || [RCTConvert BOOL:rule[@"enabled"]];
    if (!enabled) {
      return;
    }
    NSDictionary *match = [RCTConvert NSDictionary:rule[@"match"]];
    NSDictionary *customKeys = [RCTConvert NSDictionary:match[@"customKeys"]];
    if (customKeys.count == 0) {
      return;
    }
    __block BOOL matches = YES;
    [customKeys enumerateKeysAndObjectsUsingBlock:^(id  _Nonnull key, id  _Nonnull obj, BOOL * _Nonnull stopKeys) {
      NSString *expectedValue = [obj description];
      NSString *actualValue = [[content valueForKey:[key description]] description];
      if (actualValue.length == 0 || ![actualValue isEqualToString:expectedValue]) {
        matches = NO;
        *stopKeys = YES;
      }
    }];
    if (!matches) {
      return;
    }
    NSDictionary *override = [RCTConvert NSDictionary:rule[@"override"]];
    if ([override.allKeys containsObject:@"logSampleRate"]) {
      model.logSampleRate = @([RCTConvert double:override[@"logSampleRate"]]);
    }
    if ([override.allKeys containsObject:@"rumSampleRate"]) {
      model.rumSampleRate = @([RCTConvert double:override[@"rumSampleRate"]]);
    }
    if ([override.allKeys containsObject:@"traceSampleRate"]) {
      model.traceSampleRate = @([RCTConvert double:override[@"traceSampleRate"]]);
    }
    NSString *ruleId = [RCTConvert NSString:rule[@"id"]];
    [appliedRuleIds addObject:ruleId.length > 0 ? ruleId : [NSString stringWithFormat:@"rule_%lu", (unsigned long)idx]];
  }];
  return appliedRuleIds;
}

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
    if ([context.allKeys containsObject:@"compressIntakeRequests"]) {
      config.compressIntakeRequests = [RCTConvert BOOL:context[@"compressIntakeRequests"]];
    }
    if ([context.allKeys containsObject:@"globalContext"]) {
      config.globalContext = [RCTConvert NSDictionary:context[@"globalContext"]];
    }
    if ([context.allKeys containsObject:@"groupIdentifiers"]){
      config.groupIdentifiers = [RCTConvert NSArray:context[@"groupIdentifiers"]];
    }
    if ([context.allKeys containsObject:@"dbDiscardStrategy"]){
      config.dbDiscardType = [RCTConvert int:context[@"dbDiscardStrategy"]];
    }
    if ([context.allKeys containsObject:@"enableLimitWithDbSize"]){
      config.enableLimitWithDbSize = [RCTConvert BOOL:context[@"enableLimitWithDbSize"]];
    }
    if ([context.allKeys containsObject:@"dbCacheLimit"]){
      config.dbCacheLimit = [RCTConvert double:context[@"dbCacheLimit"]];
    }
    if ([context.allKeys containsObject:@"dataModifier"]){
      NSDictionary *dataModifierDict = [[RCTConvert NSDictionary:context[@"dataModifier"]] copy];
      config.dataModifier = ^id _Nullable(NSString * _Nonnull key, id  _Nonnull value) {
        if ([dataModifierDict.allKeys containsObject:key]) {
          return dataModifierDict[key];
        }
        return value;
      };
    }
    if ([context.allKeys containsObject:@"lineDataModifier"]){
      NSDictionary *dataModifierDict = [[RCTConvert NSDictionary:context[@"lineDataModifier"]] copy];
      config.lineDataModifier = ^NSDictionary<NSString *,id> * _Nullable(NSString * _Nonnull measurement, NSDictionary<NSString *,id> * _Nonnull data) {
        if ([measurement isEqualToString:FT_LOGGER_SOURCE] || [measurement isEqualToString:FT_LOGGER_TVOS_SOURCE]) {
          return [dataModifierDict valueForKey:@"log"];
        }else{
          return [dataModifierDict valueForKey:measurement];
        }
      };
    }
    if ([context.allKeys containsObject:@"remoteConfiguration"]){
      config.remoteConfiguration = [RCTConvert BOOL:context[@"remoteConfiguration"]];
    }
    if ([context.allKeys containsObject:@"remoteConfigMiniUpdateInterval"]){
      config.remoteConfigMiniUpdateInterval = [RCTConvert int:context[@"remoteConfigMiniUpdateInterval"]];
    }
    _remoteConfigOverrideRules = [RCTConvert NSArray:context[@"remoteConfigOverrideRules"]];
    _remoteConfigurationEnabled = config.remoteConfiguration;
    _remoteConfigMiniUpdateInterval = config.remoteConfigMiniUpdateInterval;
    if (config.remoteConfiguration) {
      __weak typeof(self) weakSelf = self;
      config.remoteConfigFetchCompletionBlock = ^FTRemoteConfigModel * _Nullable(BOOL success, NSError * _Nullable error, FTRemoteConfigModel * _Nullable model, NSDictionary<NSString *,id> * _Nullable content) {
        NSArray<NSString *> *appliedRuleIds = [weakSelf applyRemoteConfigOverrideRulesWithModel:model content:content];
        [weakSelf emitAutoRemoteConfigEventWithSuccess:success content:content appliedRuleIds:appliedRuleIds error:error];
        if (appliedRuleIds.count > 0) {
          return model;
        }
        return nil;
      };
    }
    NSString *pkgInfo = [RCTConvert NSString:context[@"pkgInfo"]];
    if (pkgInfo) {
      [config addPkgInfo:@"reactnative" value:pkgInfo];
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
                 unbindRUMUserData_Resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject
                 ){
    [[FTMobileAgent sharedInstance] unbindUser];
    resolve(nil);
}
RCT_REMAP_METHOD(appendGlobalContext,
                 appendGlobalContext:(NSDictionary *)context
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [FTMobileAgent appendGlobalContext:context];
    resolve(nil);
}
RCT_REMAP_METHOD(appendRUMGlobalContext,
                 appendRUMGlobalContext:(NSDictionary *)context
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [FTMobileAgent appendRUMGlobalContext:context];
    resolve(nil);
}
RCT_REMAP_METHOD(appendLogGlobalContext,
                 appendLogGlobalContext:(NSDictionary *)context
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [FTMobileAgent appendLogGlobalContext:context];
    resolve(nil);
}

RCT_REMAP_METHOD(flushSyncData,
                 flushSyncData_Resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject
                 ){
    [[FTMobileAgent sharedInstance] flushSyncData];
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
RCT_REMAP_METHOD(shutDown,
                 shutDown_findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [FTMobileAgent shutDown];
    resolve(nil);
}
RCT_REMAP_METHOD(clearAllData,
                 clearAllData_findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    [FTMobileAgent clearAllData];
    resolve(nil);
}
RCT_REMAP_METHOD(updateRemoteConfig,
                 updateRemoteConfig_findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    if (!_remoteConfigurationEnabled) {
      reject(@"E_REMOTE_CONFIG_DISABLED", @"Remote configuration is not enabled.", nil);
      return;
    }
    [FTMobileAgent updateRemoteConfigWithMiniUpdateInterval:_remoteConfigMiniUpdateInterval completion:^FTRemoteConfigModel * _Nullable(BOOL success, NSError * _Nullable error, FTRemoteConfigModel * _Nullable model, NSDictionary<NSString *,id> * _Nullable content) {
      NSArray<NSString *> *appliedRuleIds = [self applyRemoteConfigOverrideRulesWithModel:model content:content];
      NSDictionary *result = [self remoteConfigResultWithSuccess:success content:content appliedRuleIds:appliedRuleIds error:error triggerType:@"manual"];
      if (success) {
        resolve(result);
      } else {
        NSString *message = error.localizedDescription ?: @"Remote config update failed.";
        reject(@"E_REMOTE_CONFIG_UPDATE_FAILED", message, error);
      }
      if (appliedRuleIds.count > 0) {
        return model;
      }
      return nil;
    }];
}
RCT_REMAP_METHOD(updateRemoteConfigWithMiniUpdateInterval,
                 interval:(int)interval
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  if (!_remoteConfigurationEnabled) {
    reject(@"E_REMOTE_CONFIG_DISABLED", @"Remote configuration is not enabled.", nil);
    return;
  }
  [FTMobileAgent updateRemoteConfigWithMiniUpdateInterval:(NSInteger)interval completion:^FTRemoteConfigModel * _Nullable(BOOL success, NSError * _Nullable error, FTRemoteConfigModel * _Nullable model, NSDictionary<NSString *,id> * _Nullable content) {
    NSArray<NSString *> *appliedRuleIds = [self applyRemoteConfigOverrideRulesWithModel:model content:content];
    NSDictionary *result = [self remoteConfigResultWithSuccess:success content:content appliedRuleIds:appliedRuleIds error:error triggerType:@"manual"];
    if (success) {
      resolve(result);
    } else {
      NSString *message = error.localizedDescription ?: @"Remote config update failed.";
      reject(@"E_REMOTE_CONFIG_UPDATE_FAILED", message, error);
    }
    if (appliedRuleIds.count > 0) {
      return model;
    }
    return nil;
  }];
}

@end
