//
//  FTReactNativeTrace.h
//  FtMobileAgent
//
//  Created by Hu Leilei on 2021/12/14.
//  Copyright © 2021 Facebook. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>


#ifdef RCT_NEW_ARCH_ENABLED
#import <FTSdkReactNative/FTSdkReactNative.h>
@interface FTReactNativeTrace: NSObject <NativeFTReactNativeTraceSpec>
#else

#import <React/RCTBridgeModule.h>
@interface FTReactNativeTrace : NSObject <RCTBridgeModule>
#endif

@end


