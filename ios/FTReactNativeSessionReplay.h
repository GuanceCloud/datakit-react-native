#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

#if RCT_NEW_ARCH_ENABLED
#import <FTSdkReactNative/FTSdkReactNative.h>
@interface FTReactNativeSessionReplay: NSObject <NativeFTReactNativeSessionReplaySpec>
#else

#import <React/RCTBridgeModule.h>
@interface FTReactNativeSessionReplay : NSObject <RCTBridgeModule>
#endif

@end