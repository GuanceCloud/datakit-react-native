#import "FTReactNativeResource.h"
#import <GuanceSDK/FTExternalDataManager.h>
#import <GuanceSDK/FTResourceMetricsModel.h>
#import <GuanceSDK/FTResourceContentModel.h>
#import <React/RCTConvert.h>

static NSString * const FTReactNativeWebSocketErrorDomain = @"com.guance.react-native.websocket";

void FTAddReactNativeResource(NSString *key, NSDictionary *content, NSDictionary *metrics) {
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
      if ([content[@"webSocketHandshake"] boolValue] && [metrics[@"resource_http_protocol"] isKindOfClass:NSString.class]) {
        metricsModel.resourceHttpProtocol = metrics[@"resource_http_protocol"];
      }
  }
  FTResourceContentModel *contentModel = [[FTResourceContentModel alloc]init];
  contentModel.url = [RCTConvert NSURL:content[@"url"]];
  contentModel.httpMethod = [RCTConvert NSString:content[@"httpMethod"]];
  contentModel.requestHeader = [RCTConvert NSDictionary:content[@"requestHeader"]];
  contentModel.responseHeader = [RCTConvert NSDictionary:content[@"responseHeader"]];
  contentModel.responseBody = [RCTConvert NSString:content[@"responseBody"]];
  contentModel.httpStatusCode = [RCTConvert int:content[@"resourceStatus"]];
  if ([content.allKeys containsObject:@"errorMessage"]) {
    NSString *errorMessage = [RCTConvert NSString:content[@"errorMessage"]];
    if (errorMessage.length > 0) {
      NSInteger errorCode = -1;
      if ([content.allKeys containsObject:@"errorCode"]) {
        errorCode = [RCTConvert NSInteger:content[@"errorCode"]];
      }
      contentModel.errorMessage = errorMessage;
      contentModel.error = [NSError errorWithDomain:FTReactNativeWebSocketErrorDomain
                                               code:errorCode
                                           userInfo:@{NSLocalizedDescriptionKey: errorMessage}];
    }
  }
  if ([content.allKeys containsObject:@"resourceType"]) {
    contentModel.resourceType = [RCTConvert NSString:content[@"resourceType"]];
  }
  if ([content.allKeys containsObject:@"webSocketHandshake"]) {
    contentModel.webSocketHandshake = [RCTConvert BOOL:content[@"webSocketHandshake"]];
  }
  if ([content.allKeys containsObject:@"webSocketHandshakeState"]) {
    contentModel.webSocketHandshakeState = [RCTConvert NSString:content[@"webSocketHandshakeState"]];
  }

  [[FTExternalDataManager sharedManager] addResourceWithKey:key metrics:metricsModel content:contentModel];
}
