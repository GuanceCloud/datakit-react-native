#import "AppDelegate.h"
#import <ReactNativeNavigation/ReactNativeNavigation.h>
#import <React/RCTBundleURLProvider.h>
#import <FTMobileReactNativeSDK/FTReactNativeRUM.h>
#import <FTMobileSDK/FTMobileAgent.h>
@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
//  //混合开发 SDK 初始化示例
//  [self guanceSDKInit];
  
  self.moduleName = @"FtMobileAgentExample";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};
  
  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  [ReactNativeNavigation bootstrapWithBridge:bridge];
  return YES;
}

- (void)guanceSDKInit{
  FTMobileConfig *config = [[FTMobileConfig alloc]initWithDatakitUrl:@"datakitUrl"];
  config.enableSDKDebugLog = YES;
  [FTMobileAgent startWithConfigOptions:config];
  
  FTRumConfig *rumConfig = [[FTRumConfig alloc]initWithAppid:@"rumAppId"];
  rumConfig.enableTraceUserResource = YES;
  #if DEBUG
    // 需要过滤掉仅在开发环境中发生的 React Native 符号化调用请求和 Expo日志调用请求
    rumConfig.resourceUrlHandler = ^BOOL(NSURL * _Nonnull url) {
      return filterBlackResource(url);
    };
  #endif
  // ...
  [[FTMobileAgent sharedInstance] startRumWithConfigOptions:rumConfig];
  // ...
}
- (NSArray<id<RCTBridgeModule>> *)extraModulesForBridge:(RCTBridge *)bridge {
  return [ReactNativeNavigation extraModulesForBridge:bridge];
}
- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}
- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
