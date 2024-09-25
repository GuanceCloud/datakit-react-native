#import "FTSessionReplay.h"
#import "FTRumSessionReplay.h"
#import "FTSessionReplayConfig+Private.h"
#import <React/RCTConvert.h>
#import "FTRCTTextViewRecorder.h"
@implementation FTSessionReplay
@synthesize bridge = _bridge;

RCT_EXPORT_MODULE()

// Example method
// See // https://reactnative.dev/docs/native-modules-ios
RCT_REMAP_METHOD(sessionReplayConfig,
                  context:(NSDictionary *)context
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  FTSessionReplayConfig *config = [[FTSessionReplayConfig alloc]init];
  if([context.allKeys containsObject:@"sampleRate"]){
    NSNumber *sampleRate = context[@"sampleRate"];
    config.sampleRate = [sampleRate intValue];
  }
  if([context.allKeys containsObject:@"privacy"]){
    int privacy = [context[@"privacy"] intValue];
    switch (privacy){
      case 0:
        config.privacy = FTSRPrivacyMask;
        break;
      case 1:
        config.privacy = FTSRPrivacyAllow;
        break;
      case 2:
        config.privacy = FTSRPrivacyMaskUserInput;
        break;
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
