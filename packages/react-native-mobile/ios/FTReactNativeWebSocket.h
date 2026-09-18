#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <FTSdkReactNative/FTSdkReactNative.h>
@interface FTReactNativeWebSocket : NSObject <NativeFTReactNativeWebSocketSpec>
#else
@interface FTReactNativeWebSocket : NSObject <RCTBridgeModule>
#endif
@end
