#import "AppDelegate.h"
#import <ReactNativeNavigation/ReactNativeNavigation.h>
#import <React/RCTBundleURLProvider.h>
#import <FTMobileReactNativeSDK/FTReactNativeUtils.h>
#import <FTMobileSDK/FTMobileAgent.h>
@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
//  //Hybrid development SDK initialization example
//  [self SDKInit];

  self.moduleName = @"FtMobileAgentExample";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  [ReactNativeNavigation bootstrapWithBridge:bridge];
  return YES;
}

- (void)SDKInit{
  FTMobileConfig *config = [[FTMobileConfig alloc]initWithDatakitUrl:@"datakitUrl"];
  config.enableSDKDebugLog = YES;
  [FTMobileAgent startWithConfigOptions:config];

  FTRumConfig *rumConfig = [[FTRumConfig alloc]initWithAppid:@"rumAppId"];
  rumConfig.enableTraceUserResource = YES;
  #if DEBUG
    // Need to filter out React Native symbolication requests and Expo log requests that only occur in development environment
    rumConfig.resourceUrlHandler = ^BOOL(NSURL * _Nonnull url) {
      return [FTReactNativeUtils filterBlackResource:url];
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
