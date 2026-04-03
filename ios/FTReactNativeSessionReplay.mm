#import "FTReactNativeSessionReplay.h"
#import <FTMobileSDK/FTRumSessionReplay.h>
#import <FTMobileSDK/FTSessionReplayConfig+Private.h>
#import <React/RCTConvert.h>
#import "FTRCTTextViewRecorder.h"
@implementation FTReactNativeSessionReplay
@synthesize bridge = _bridge;

RCT_EXPORT_MODULE()

// Example method
// See // https://reactnative.dev/docs/native-modules-ios
RCT_REMAP_METHOD(sessionReplayConfig,
                 context:(NSDictionary *)context
                 resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject){
  [self sessionReplayConfig:context resolve:resolve reject:reject];
}


#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeFTReactNativeSessionReplaySpecJSI>(params);
}
#endif
- (void)sessionReplayConfig:(NSDictionary *)context resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject{
  FTSessionReplayConfig *config = [[FTSessionReplayConfig alloc]init];
  if([context.allKeys containsObject:@"sampleRate"]){
    config.sampleRate = [RCTConvert double:context[@"sampleRate"]]*100;
  }
  if([context.allKeys containsObject:@"sessionReplayOnErrorSampleRate"]){
    config.sessionReplayOnErrorSampleRate = [RCTConvert double:context[@"sessionReplayOnErrorSampleRate"]]*100;
  }
  if([context.allKeys containsObject:@"privacy"]){
    int privacy = [context[@"privacy"] intValue];
    config.privacy = (FTSRPrivacy)privacy;
  }
  
  // Handle fine-grained privacy settings (overrides deprecated privacy setting if provided)
  if([context.allKeys containsObject:@"touchPrivacy"]){
    int touchPrivacy = [context[@"touchPrivacy"] intValue];
    config.touchPrivacy = (FTTouchPrivacyLevel)touchPrivacy;
  }
  
  if([context.allKeys containsObject:@"textAndInputPrivacy"]){
    int textAndInputPrivacy = [context[@"textAndInputPrivacy"] intValue];
    config.textAndInputPrivacy = (FTTextAndInputPrivacyLevel)textAndInputPrivacy;
  }
  
  if([context.allKeys containsObject:@"imagePrivacy"]){
    int imagePrivacy = [context[@"imagePrivacy"] intValue];
    config.imagePrivacy = (FTImagePrivacyLevel)imagePrivacy;
  }
  
  if([context.allKeys containsObject:@"enableLinkRUMKeys"]){
    NSArray *rumKeys = context[@"enableLinkRUMKeys"];
    if([rumKeys isKindOfClass:[NSArray class]]){
      config.enableLinkRUMKeys = rumKeys;
    }
  }
  FTRCTTextViewRecorder *recorder = [[FTRCTTextViewRecorder alloc]initWithUIManager:_bridge.uiManager];
  [config setAdditionalNodeRecorders:@[recorder]];
  [[FTRumSessionReplay sharedInstance] startWithSessionReplayConfig:config];
  resolve(nil);
}
+ (BOOL)requiresMainQueueSetup {
  return NO;
}
@end
