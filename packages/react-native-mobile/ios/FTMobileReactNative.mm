//
//  FTMobileReactNative.m
//  FtMobileAgent
//
//  Created by Hu Leilei on 2021/12/14.
//  Copyright © 2021 Facebook. All rights reserved.
//

#import "FTMobileReactNative.h"
#import <React/RCTConvert.h>
#import <FTMobileSDK/FTMobileAgent.h>
#import <FTMobileSDK/FTMobileConfig+Private.h>
#import <FTMobileSDK/FTThreadDispatchManager.h>
#import <FTMobileSDK/FTConstants.h>
#import <FTMobileSDK/FTJSONUtil.h>
#import <FTMobileSDK/FTRemoteConfigModel+Private.h>

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
                                     triggerType:(NSString *)triggerType
                                           model:(FTRemoteConfigModel *_Nullable)model
                                           rules:(NSArray<NSDictionary *> *_Nullable)rules
{
  // Use local rules if provided, otherwise use global rules
  NSArray<NSDictionary *> *rulesToApply = rules ?: _remoteConfigOverrideRules;
  NSArray<NSString *> *appliedRuleIds = @[];
  
  if (model && content && rulesToApply.count > 0) {
    appliedRuleIds = [self applyRemoteConfigOverrideRulesWithModel:model content:content rules:rulesToApply];
  }
  
  NSMutableDictionary *payload = [NSMutableDictionary dictionary];
  payload[@"triggerType"] = triggerType;
  payload[@"success"] = @(success);
  payload[@"platform"] = @"ios";
  payload[@"timestamp"] = @((long long)([[NSDate date] timeIntervalSince1970] * 1000));
  
  // Overridden content after applying rules
  if (model && appliedRuleIds.count > 0) {
    NSDictionary *overriddenContent = [model toDictionary];
    payload[@"rawJson"] = [FTJSONUtil convertToJsonData:overriddenContent];
    payload[@"appliedOverrideRuleIds"] = appliedRuleIds;
  } else if (content) {
    payload[@"rawJson"] = [FTJSONUtil convertToJsonData:content];
  }
  if (error) {
    payload[@"errorCode"] = @(error.code);
    payload[@"errorMessage"] = error.localizedDescription ?: @"";
  }
  return payload;
}

- (void)emitAutoRemoteConfigEventWithSuccess:(BOOL)success
                                      content:(NSDictionary<NSString *, id> *_Nullable)content
                                        error:(NSError *_Nullable)error
                                        model:(FTRemoteConfigModel *_Nullable)model
{
  if (!_hasListeners) {
    return;
  }
  [self sendEventWithName:FTRemoteConfigCallbackEvent
                     body:[self remoteConfigResultWithSuccess:success
                                                     content:content
                                                       error:error
                                                 triggerType:@"auto"
                                                       model:model
                                                       rules:nil]];
}

- (BOOL)isEqualValue:(id)value1 toValue:(id)value2 {
  if (value1 == nil && value2 == nil) {
    return YES;
  }
  if (value1 == nil || value2 == nil) {
    return NO;
  }

  if ([value1 isKindOfClass:[NSString class]]) {
    id normalizedValue1 = [self parsedJSONArrayIfNeeded:value1];
    if (normalizedValue1 != value1) {
      return [self isEqualValue:normalizedValue1 toValue:value2];
    }
  }
  
  // Handle NSNumber comparison
  if ([value1 isKindOfClass:[NSNumber class]] && [value2 isKindOfClass:[NSNumber class]]) {
    return [value1 isEqualToNumber:value2];
  }
  
  // Handle NSString comparison
  if ([value1 isKindOfClass:[NSString class]] && [value2 isKindOfClass:[NSString class]]) {
    return [value1 isEqualToString:value2];
  }
  
  // Handle NSArray comparison
  if ([value1 isKindOfClass:[NSArray class]] && [value2 isKindOfClass:[NSArray class]]) {
    return [value1 isEqualToArray:value2];
  }
  
  // Handle NSDictionary comparison
  if ([value1 isKindOfClass:[NSDictionary class]] && [value2 isKindOfClass:[NSDictionary class]]) {
    return [value1 isEqualToDictionary:value2];
  }
  
  // For other types, use description comparison as fallback
  return [[value1 description] isEqualToString:[value2 description]];
}

- (BOOL)matchesCustomKeyActual:(id)actualValue expected:(id)expectedValue {
  if ([expectedValue isKindOfClass:[NSDictionary class]]) {
    NSDictionary *rule = (NSDictionary *)expectedValue;
    id containsValue = rule[@"contains"];
    if (containsValue != nil) {
      return [self containsValueInActual:actualValue expected:containsValue];
    }
  }
  return [self isEqualValue:actualValue toValue:expectedValue];
}

- (BOOL)containsValueInActual:(id)actualValue expected:(id)expectedValue {
  id normalizedActual = [actualValue isKindOfClass:[NSString class]]
    ? [self parsedJSONArrayIfNeeded:actualValue]
    : actualValue;
  if (![normalizedActual isKindOfClass:[NSArray class]]) {
    return [self isEqualValue:normalizedActual toValue:expectedValue];
  }
  NSArray *array = (NSArray *)normalizedActual;
  return [array containsObject:expectedValue];
}

- (id)parsedJSONArrayIfNeeded:(NSString *)value {
    if (!value) return nil;

    NSData *data = [value dataUsingEncoding:NSUTF8StringEncoding];
    NSError *error = nil;
    id object = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
    
    if (!error && [object isKindOfClass:[NSArray class]]) {
        return object;
    }
    return value;
}

- (NSArray<NSString *> *)applyRemoteConfigOverrideRulesWithModel:(FTRemoteConfigModel *_Nullable)model
                                                          content:(NSDictionary<NSString *, id> *_Nullable)content
                                                            rules:(NSArray<NSDictionary *> *)rules
{
  if (!model || !content || rules.count == 0) {
    return @[];
  }
  NSMutableArray<NSString *> *appliedRuleIds = [NSMutableArray array];
  [rules enumerateObjectsUsingBlock:^(NSDictionary * _Nonnull rule, NSUInteger idx, BOOL * _Nonnull stop) {
    BOOL enabled = ![rule.allKeys containsObject:@"enabled"] || [RCTConvert BOOL:rule[@"enabled"]];
    if (!enabled) {
      return;
    }
    NSDictionary *match = [RCTConvert NSDictionary:rule[@"match"]];
    NSDictionary *customKeys = [RCTConvert NSDictionary:match[@"customKeys"]];
    NSDictionary *override = [RCTConvert NSDictionary:rule[@"override"]];

    if (customKeys.count == 0 || override.count == 0) {
      return;
    }
    __block BOOL matches = YES;
    [customKeys enumerateKeysAndObjectsUsingBlock:^(id  _Nonnull key, id  _Nonnull obj, BOOL * _Nonnull stopKeys) {
      id actualValue = [content valueForKey:[key description]];
      if (![self matchesCustomKeyActual:actualValue expected:obj]) {
        matches = NO;
        *stopKeys = YES;
      }
    }];
    if (!matches) {
      return;
    }
    
    // Basic configuration properties
    if ([override.allKeys containsObject:@"env"]) {
      model.env = [RCTConvert NSString:override[@"env"]];
    }
    if ([override.allKeys containsObject:@"serviceName"]) {
      model.serviceName = [RCTConvert NSString:override[@"serviceName"]];
    }
    if ([override.allKeys containsObject:@"autoSync"]) {
      model.autoSync = @([RCTConvert double:override[@"autoSync"]]);
    }
    if ([override.allKeys containsObject:@"compressIntakeRequests"]) {
      model.compressIntakeRequests = @([RCTConvert double:override[@"compressIntakeRequests"]]);
    }
    if ([override.allKeys containsObject:@"syncPageSize"]) {
      model.syncPageSize = @([RCTConvert double:override[@"syncPageSize"]]);
    }
    if ([override.allKeys containsObject:@"syncSleepTime"]) {
      model.syncSleepTime = @([RCTConvert double:override[@"syncSleepTime"]]);
    }
    
    // RUM configuration properties
    if ([override.allKeys containsObject:@"rumSampleRate"]) {
      model.rumSampleRate = @([RCTConvert double:override[@"rumSampleRate"]]);
    }
    if ([override.allKeys containsObject:@"rumSessionOnErrorSampleRate"]) {
      model.rumSessionOnErrorSampleRate = @([RCTConvert double:override[@"rumSessionOnErrorSampleRate"]]);
    }
    if ([override.allKeys containsObject:@"rumEnableTraceUserAction"]) {
      model.rumEnableTraceUserAction = @([RCTConvert double:override[@"rumEnableTraceUserAction"]]);
    }
    if ([override.allKeys containsObject:@"rumEnableTraceUserView"]) {
      model.rumEnableTraceUserView = @([RCTConvert double:override[@"rumEnableTraceUserView"]]);
    }
    if ([override.allKeys containsObject:@"rumEnableTraceUserResource"]) {
      model.rumEnableTraceUserResource = @([RCTConvert double:override[@"rumEnableTraceUserResource"]]);
    }
    if ([override.allKeys containsObject:@"rumEnableResourceHostIP"]) {
      model.rumEnableResourceHostIP = @([RCTConvert double:override[@"rumEnableResourceHostIP"]]);
    }
    if ([override.allKeys containsObject:@"rumEnableTrackAppUIBlock"]) {
      model.rumEnableTrackAppUIBlock = @([RCTConvert double:override[@"rumEnableTrackAppUIBlock"]]);
    }
    if ([override.allKeys containsObject:@"rumBlockDurationMs"]) {
      model.rumBlockDurationMs = @([RCTConvert double:override[@"rumBlockDurationMs"]]);
    }
    if ([override.allKeys containsObject:@"rumEnableTrackAppCrash"]) {
      model.rumEnableTrackAppCrash = @([RCTConvert double:override[@"rumEnableTrackAppCrash"]]);
    }
    if ([override.allKeys containsObject:@"rumEnableTrackAppANR"]) {
      model.rumEnableTrackAppANR = @([RCTConvert double:override[@"rumEnableTrackAppANR"]]);
    }
    if ([override.allKeys containsObject:@"rumEnableTraceWebView"]) {
      model.rumEnableTraceWebView = @([RCTConvert double:override[@"rumEnableTraceWebView"]]);
    }
    if ([override.allKeys containsObject:@"rumAllowWebViewHost"]) {
      model.rumAllowWebViewHost = [RCTConvert NSArray:override[@"rumAllowWebViewHost"]];
    }
    
    // Trace configuration properties
    if ([override.allKeys containsObject:@"traceSampleRate"]) {
      model.traceSampleRate = @([RCTConvert double:override[@"traceSampleRate"]]);
    }
    if ([override.allKeys containsObject:@"traceEnableAutoTrace"]) {
      model.traceEnableAutoTrace = @([RCTConvert double:override[@"traceEnableAutoTrace"]]);
    }
    if ([override.allKeys containsObject:@"traceType"]) {
      model.traceType = [RCTConvert NSString:override[@"traceType"]];
    }
    
    // Log configuration properties
    if ([override.allKeys containsObject:@"logSampleRate"]) {
      model.logSampleRate = @([RCTConvert double:override[@"logSampleRate"]]);
    }
    if ([override.allKeys containsObject:@"logLevelFilters"]) {
      model.logLevelFilters = [RCTConvert NSArray:override[@"logLevelFilters"]];
    }
    if ([override.allKeys containsObject:@"logEnableCustomLog"]) {
      model.logEnableCustomLog = @([RCTConvert double:override[@"logEnableCustomLog"]]);
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
  [self sdkConfig:context resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(setDatakitURL,
                 datakitUrl:(NSString *)datakitUrl
                 setDatakitURLWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  [self setDatakitURL:datakitUrl resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(setDatawayURL,
                 datawayUrl:(NSString *)datawayUrl
                 clientToken:(NSString *)clientToken
                 setDatawayURLWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  [self setDatawayURL:datawayUrl clientToken:clientToken resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(bindRUMUserData,
                  userId:(NSString*)userId userName:(NSString*)userName userEmail:(NSString*)userEmail extra:(NSDictionary *)extra
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self bindRUMUserData:userId userName:userName userEmail:userName extra:extra resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(unbindRUMUserData,
                 unbindRUMUserData_Resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject
                 ){
  [self unbindRUMUserData:resolve reject:reject];
}
RCT_REMAP_METHOD(appendGlobalContext,
                 appendGlobalContext:(NSDictionary *)context
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self appendGlobalContext:context resolve:resolve reject:reject];
}
RCT_REMAP_METHOD(appendRUMGlobalContext,
                 appendRUMGlobalContext:(NSDictionary *)context
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self appendRUMGlobalContext:context resolve:resolve reject:reject];
}
RCT_REMAP_METHOD(appendLogGlobalContext,
                 appendLogGlobalContext:(NSDictionary *)context
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self appendLogGlobalContext:context resolve:resolve reject:reject];
}

RCT_REMAP_METHOD(flushSyncData,
                 flushSyncData_Resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject
                 ){
  [self flushSyncData:resolve reject:reject];
}
RCT_REMAP_METHOD(trackEventFromExtension,
                 identifier:(NSString*)identifier
                 findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self trackEventFromExtension:identifier resolve:resolve reject:reject];
}
RCT_REMAP_METHOD(shutDown,
                 shutDown_findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self shutDown:resolve reject:reject];
}
RCT_REMAP_METHOD(clearAllData,
                 clearAllData_findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
  [self clearAllData:resolve reject:reject];
}
#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeFTMobileReactNativeSpecJSI>(params);
}
#endif
- (void)sdkConfig:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
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
          [config setEnvWithType:(FTEnv)envType];
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
      config.dbDiscardType = (FTDBCacheDiscard)[RCTConvert int:context[@"dbDiscardStrategy"]];
    }
    if ([context.allKeys containsObject:@"enableLimitWithDbSize"]){
      config.enableLimitWithDbSize = [RCTConvert BOOL:context[@"enableLimitWithDbSize"]];
    }
    if ([context.allKeys containsObject:@"dbCacheLimit"]){
      config.dbCacheLimit = (long)[RCTConvert double:context[@"dbCacheLimit"]];
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
      __weak __typeof(self) weakSelf = self;
      config.remoteConfigFetchCompletionBlock = ^FTRemoteConfigModel * _Nullable(BOOL success, NSError * _Nullable error, FTRemoteConfigModel * _Nullable model, NSDictionary<NSString *,id> * _Nullable content) {
        __typeof(self) strongSelf = weakSelf;
        if (!strongSelf) {
          return nil;
        }
        @try {
          NSArray<NSString *> *appliedRuleIds = [strongSelf applyRemoteConfigOverrideRulesWithModel:model content:content rules:strongSelf->_remoteConfigOverrideRules];
          [strongSelf emitAutoRemoteConfigEventWithSuccess:success content:content error:error model:model];
          if (appliedRuleIds.count > 0) {
            return model;
          }
        } @catch (NSException *exception) {
          [strongSelf emitAutoRemoteConfigEventWithSuccess:NO content:nil error:nil model:nil];
        }
        return nil;
      };
    }
    [FTMobileAgent startWithConfigOptions:config];
    resolve(nil);
  }];
}
- (void)setDatakitURL:(NSString *)datakitUrl resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  [FTMobileAgent setDatakitURL:datakitUrl];
  resolve(nil);
}

- (void)setDatawayURL:(NSString *)datawayUrl clientToken:(NSString *)clientToken resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  [FTMobileAgent setDatawayURL:datawayUrl clientToken:clientToken];
  resolve(nil);
}

- (void)appendGlobalContext:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  [FTMobileAgent appendGlobalContext:context];
  resolve(nil);
}

- (void)appendLogGlobalContext:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
  [FTMobileAgent appendLogGlobalContext:context];
  resolve(nil);
}

- (void)appendRUMGlobalContext:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
  [FTMobileAgent appendRUMGlobalContext:context];
  resolve(nil);
}

- (void)bindRUMUserData:(NSString *)userId userName:(NSString *)userName userEmail:(NSString *)userEmail extra:(NSDictionary *)extra resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
  [[FTMobileAgent sharedInstance] bindUserWithUserID:userId userName:userName userEmail:userEmail extra:extra];
  resolve(nil);
}
- (void)unbindRUMUserData:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  [[FTMobileAgent sharedInstance] unbindUser];
  resolve(nil);
}
- (void)clearAllData:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject {
  [FTMobileAgent clearAllData];
  resolve(nil);
}

- (void)flushSyncData:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
  [[FTMobileAgent sharedInstance] flushSyncData];
  resolve(nil);
}

- (void)shutDown:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
  [FTMobileAgent shutDown];
  resolve(nil);
}

- (void)trackEventFromExtension:(NSString *)identifier resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject { 
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
RCT_REMAP_METHOD(updateRemoteConfig,
                 updateRemoteConfig_findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject){
    if (!_remoteConfigurationEnabled) {
      reject(@"E_REMOTE_CONFIG_DISABLED", @"Remote configuration is not enabled.", nil);
      return;
    }
    [FTMobileAgent updateRemoteConfigWithMiniUpdateInterval:_remoteConfigMiniUpdateInterval completion:^FTRemoteConfigModel * _Nullable(BOOL success, NSError * _Nullable error, FTRemoteConfigModel * _Nullable model, NSDictionary<NSString *,id> * _Nullable content) {
      @try {
        NSDictionary *result = [self remoteConfigResultWithSuccess:success content:content error:error triggerType:@"manual" model:model rules:nil];
        if (success) {
          resolve(result);
        } else {
          NSString *message = error.localizedDescription ?: @"Remote config update failed.";
          reject(@"E_REMOTE_CONFIG_UPDATE_FAILED", message, error);
        }
        NSArray<NSString *> *appliedRuleIds = result[@"appliedOverrideRuleIds"];
        if (appliedRuleIds.count > 0) {
          return model;
        }
      } @catch (NSException *exception) {
        NSString *message = [NSString stringWithFormat:@"Exception occurred: %@", exception];
        reject(@"E_REMOTE_CONFIG_EXCEPTION", message, nil);
      }
      return nil;
    }];
}
RCT_REMAP_METHOD(updateRemoteConfigWithMiniUpdateInterval,
                  interval:(int)interval
                  rules:(NSArray *)rules
                  findEventsWithResolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject){
  if (!_remoteConfigurationEnabled) {
    reject(@"E_REMOTE_CONFIG_DISABLED", @"Remote configuration is not enabled.", nil);
    return;
  }
  __weak __typeof(self) weakSelf = self;
  [FTMobileAgent updateRemoteConfigWithMiniUpdateInterval:(NSInteger)interval completion:^FTRemoteConfigModel * _Nullable(BOOL success, NSError * _Nullable error, FTRemoteConfigModel * _Nullable model, NSDictionary<NSString *,id> * _Nullable content) {
    __typeof(self) strongSelf = weakSelf;
    if (!strongSelf) {
      return nil;
    }
    @try {
      NSArray<NSDictionary *> *rulesToApply = nil;
      if (rules != nil && ![rules isKindOfClass:[NSNull class]]) {
        rulesToApply = [RCTConvert NSArray:rules];
      }
      if (rulesToApply == nil || rulesToApply.count == 0) {
        rulesToApply = strongSelf->_remoteConfigOverrideRules;
      }
      NSDictionary *result = [strongSelf remoteConfigResultWithSuccess:success content:content error:error triggerType:@"manual" model:model rules:rulesToApply];
      if (success) {
        resolve(result);
      } else {
        NSString *message = error.localizedDescription ?: @"Remote config update failed.";
        reject(@"E_REMOTE_CONFIG_UPDATE_FAILED", message, error);
      }
      NSArray<NSString *> *appliedRuleIds = result[@"appliedOverrideRuleIds"];
      if (appliedRuleIds.count > 0) {
        return model;
      }
    } @catch (NSException *exception) {
      NSString *message = [NSString stringWithFormat:@"Exception occurred: %@", exception];
      reject(@"E_REMOTE_CONFIG_EXCEPTION", message, nil);
    }
    return nil;
  }];
}

@end
