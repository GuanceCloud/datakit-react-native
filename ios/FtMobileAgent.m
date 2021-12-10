#import "FtMobileAgent.h"
#import <FTMobileSDK/FTMobileAgent.h>
#import <FTMobileSDK/FTExternalDataManager.h>
#import <FTMobileSDK/FTResourceMetricsModel.h>
#import <FTMobileSDK/FTResourceContentModel.h>
#import <React/RCTConvert.h>
@implementation FtMobileAgent

RCT_EXPORT_MODULE()

#pragma mark - SDK BASE-

RCT_EXPORT_METHOD(sdkConfigWithServerUrl:(NSString *)serverUrl debug:(BOOL)debug datakitUUID:(NSString *)datakitUUID envType:(FTEnv)envType){
    FTMobileConfig *config = [[FTMobileConfig alloc]initWithMetricsUrl:serverUrl];
    config.enableSDKDebugLog = debug;
    config.XDataKitUUID = datakitUUID;
    config.env = envType;
    [FTMobileAgent startWithConfigOptions:config];
}

RCT_EXPORT_METHOD(bindUser:(NSString*)userId){
    [[FTMobileAgent sharedInstance] bindUserWithUserID:userId];
}

RCT_EXPORT_METHOD(unbindUser){
    [[FTMobileAgent sharedInstance] logout];
}
#pragma mark - RUM -
RCT_EXPORT_METHOD(rumConfig:(NSString *)rumAppId detail:(NSDictionary *)detail){
    if (!rumAppId) {
        return;
    }
    FTRumConfig *rumConfig = [[FTRumConfig alloc]initWithAppid:rumAppId];
    if ([detail.allKeys containsObject:@"samplerate"]) {
        rumConfig.samplerate  = [RCTConvert double:detail[@"samplerate"]]*100;
    }
    [[FTMobileAgent sharedInstance] startRumWithConfigOptions:rumConfig];
}
RCT_EXPORT_METHOD(startAction:(NSString *)actionName actionType:(NSString *)actionType){
    [[FTExternalDataManager sharedManager] addActionWithName:actionName actionType:actionType];
}
RCT_EXPORT_METHOD(starView:(NSString *)viewName viewReferer:(NSString *)viewReferer){
    [[FTExternalDataManager sharedManager] startViewWithName:viewName viewReferrer:viewReferer loadDuration:@0];
}
RCT_EXPORT_METHOD(stopView){
    [[FTExternalDataManager sharedManager] stopView];
}
RCT_EXPORT_METHOD(addError:(NSString *)stack message:(NSString *)message){
    [[FTExternalDataManager sharedManager] addErrorWithType:@"reactnative" situation:UNKNOWN message:message stack:stack];
}

RCT_EXPORT_METHOD(startResource:(NSString *)key){
    [[FTExternalDataManager sharedManager] startResourceWithKey:key];
}
RCT_EXPORT_METHOD(stopResource:(NSString *)key){
    [[FTExternalDataManager sharedManager] stopResourceWithKey:key];
}
RCT_EXPORT_METHOD(addResource:(NSString *)key metrics:(NSDictionary *)metrics content:(NSDictionary *)content){
    if (key.length==0 || content.allKeys.count == 0) {
        return;
    }
    FTResourceMetricsModel *metricsModel = nil;
    if (metrics.allKeys.count>0) {
        metricsModel = [[FTResourceMetricsModel alloc]init];
        metricsModel.duration = [RCTConvert NSNumber:metrics[@"duration"]];
        metricsModel.resource_dns = [RCTConvert NSNumber:metrics[@"resource_dns"]];
        metricsModel.resource_tcp = [RCTConvert NSNumber:metrics[@"resource_tcp"]];
        metricsModel.resource_ssl = [RCTConvert NSNumber:metrics[@"resource_ssl"]];
        metricsModel.resource_ttfb = [RCTConvert NSNumber:metrics[@"resource_ttfb"]];
        metricsModel.resource_trans = [RCTConvert NSNumber:metrics[@"resource_trans"]];
        metricsModel.resource_first_byte = [RCTConvert NSNumber:metrics[@"resource_first_byte"]];
    }
    FTResourceContentModel *contentModel = [[FTResourceContentModel alloc]init];
    contentModel.url = [RCTConvert NSURL:content[@"url"]];
    contentModel.httpMethod = [RCTConvert NSString:content[@"httpMethod"]];
    contentModel.requestHeader = [RCTConvert NSDictionary:content[@"requestHeader"]];
    contentModel.responseHeader = [RCTConvert NSDictionary:content[@"responseHeader"]];
    contentModel.responseBody = [RCTConvert NSString:content[@"responseBody"]];
    contentModel.httpStatusCode = [RCTConvert int:content[@"resourceStatus"]];
    
    [[FTExternalDataManager sharedManager] addResourceWithKey:key metrics:metricsModel content:contentModel];
}

#pragma mark - Logger -
RCT_EXPORT_METHOD(setLogConfig:(FTLogCacheDiscard)discard detail:(NSDictionary *)detail){
    FTLoggerConfig *logger = [[FTLoggerConfig alloc]init];
    logger.discardType = discard;
    if ([detail.allKeys containsObject:@"samplerate"]) {
        logger.samplerate  = [RCTConvert double:detail[@"samplerate"]]*100;
    }
    if ([detail.allKeys containsObject:@"serviceName"]) {
        logger.service = [RCTConvert NSString:detail[@"serviceName"]];
    }
    logger.enableCustomLog = [RCTConvert BOOL:detail[@"enableCustomLog"]];
    logger.enableLinkRumData = [RCTConvert BOOL:detail[@"enableLinkRumData"]];
    logger.logLevelFilter = [RCTConvert NSNumberArray:detail[@"logLevelFilters"]];
    [[FTMobileAgent sharedInstance] startLoggerWithConfigOptions:logger];
}

RCT_EXPORT_METHOD(logging:(NSString *)content status:(FTStatus)status){
    [[FTMobileAgent sharedInstance] logging:content status:status];
}
#pragma mark - Trace -
RCT_EXPORT_METHOD(setTraceConfig:(NSDictionary *)detail){
    FTTraceConfig *trace = [[FTTraceConfig alloc]init];
    if ([detail.allKeys containsObject:@"service"]) {
        trace.service = [RCTConvert NSString:detail[@"service"]];
    }
    if ([detail.allKeys containsObject:@"samplerate"]) {
        trace.samplerate =[RCTConvert double:detail[@"service"]] * 100;
    }
    trace.enableLinkRumData = [RCTConvert BOOL:detail[@"enableLinkRumData"]];
    trace.enableAutoTrace = [RCTConvert BOOL:detail[@"enableAutoTrace"]];
    [[FTMobileAgent sharedInstance] startTraceWithConfigOptions:trace];
}

RCT_EXPORT_METHOD(getTraceHeader:(NSString *)key url:(NSString *)url callback:(RCTResponseSenderBlock)callback){
    NSDictionary *traceHeader = [[FTExternalDataManager sharedManager] getTraceHeaderWithKey:key url:[NSURL URLWithString:url]];
    if (traceHeader) {
        callback(@[traceHeader]);
    }else{
        callback(nil);
    }
}

RCT_EXPORT_METHOD(addTrace:(NSString *)key detail:(NSDictionary *)detail){
    
    FTResourceContentModel *contentModel = [[FTResourceContentModel alloc]init];
    contentModel.httpMethod = [RCTConvert NSString:detail[@"httpMethod"]];
    contentModel.requestHeader = [RCTConvert NSDictionary:detail[@"requestHeader"]];
    contentModel.responseHeader = [RCTConvert NSDictionary:detail[@"responseHeader"]];
    contentModel.errorMessage = [RCTConvert NSString:detail[@"errorMessage"]];
    contentModel.httpStatusCode = [RCTConvert int:detail[@"resourceStatus"]];
    [[FTExternalDataManager sharedManager] traceWithKey:key content:contentModel];
}
-(NSDictionary *)constantsToExport{
    return @{ @"FTNetworkTraceTypeZipkin" : @(FTNetworkTraceTypeZipkin),
              @"FTNetworkTraceTypeJaeger" : @(FTNetworkTraceTypeJaeger),
              @"FTNetworkTraceTypeDDtrace" : @(FTNetworkTraceTypeDDtrace),
              @"FTStatusInfo":@(FTStatusInfo),
              @"FTStatusWarning":@(FTStatusWarning),
              @"FTStatusError":@(FTStatusError),
              @"FTStatusCritical":@(FTStatusCritical),
              @"FTStatusOk":@(FTStatusOk),
              @"FTEnvProd":@(FTEnvProd),
              @"FTEnvGray":@(FTEnvGray),
              @"FTEnvPre":@(FTEnvPre),
              @"FTEnvCommon":@(FTEnvCommon),
              @"FTEnvLocal":@(FTEnvLocal),
              @"FTDiscard":@(FTDiscard),
              @"FTDiscardOldest":@(FTDiscardOldest)
    };
}
+ (BOOL)requiresMainQueueSetup
{
  return YES;
}
@end

@implementation RCTConvert (NetworkTraceType)
RCT_ENUM_CONVERTER(FTNetworkTraceType , (@{ @"FTNetworkTraceTypeZipkin" : @(FTNetworkTraceTypeZipkin),
                                            @"FTNetworkTraceTypeJaeger" : @(FTNetworkTraceTypeJaeger),
                                            @"FTNetworkTraceTypeDDtrace" : @(FTNetworkTraceTypeDDtrace)}),
                   FTNetworkTraceTypeDDtrace, integerValue)

RCT_ENUM_CONVERTER(FTEnv, (@{@"FTEnvProd":@(FTEnvProd),
                             @"FTEnvGray":@(FTEnvGray),
                             @"FTEnvPre":@(FTEnvPre),
                             @"FTEnvCommon":@(FTEnvCommon),
                             @"FTEnvLocal":@(FTEnvLocal)
                           }), FTEnvProd, integerValue)
RCT_ENUM_CONVERTER(FTStatus, (@{@"FTStatusInfo":@(FTStatusInfo),
                                @"FTStatusWarning":@(FTStatusWarning),
                                @"FTStatusError":@(FTStatusError),
                                @"FTStatusCritical":@(FTStatusCritical),
                                @"FTStatusOk":@(FTStatusOk)
                              }), FTStatusInfo, integerValue)

RCT_ENUM_CONVERTER(FTLogCacheDiscard, (@{@"FTDiscard":@(FTDiscard),
                                         @"FTDiscardOldest":@(FTDiscardOldest)
                                       }), FTDiscard, integerValue)
@end

