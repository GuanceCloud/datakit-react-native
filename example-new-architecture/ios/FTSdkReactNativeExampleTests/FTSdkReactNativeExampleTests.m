#import <UIKit/UIKit.h>
#import <XCTest/XCTest.h>

#import <React/RCTLog.h>
#import <React/RCTRootView.h>
#import <FTMobileReactNativeSDK/FTReactNativeUtils.h>

#define TIMEOUT_SECONDS 600
#define TEXT_TO_LOOK_FOR @"Welcome to React"

@interface FTSdkReactNativeExampleTests : XCTestCase

@end

@implementation FTSdkReactNativeExampleTests

- (void)testFiltersReactNativeDevelopmentResources
{
  NSArray<NSString *> *urls = @[
    @"http://localhost:8081/inspector/device?name=iPhone",
    @"http://192.168.1.20:8081/inspector/device?name=iPhone",
    @"ws://10.0.2.2:8081/message?device=emulator",
    @"http://127.0.0.1:8088/debugger-proxy?role=client",
    @"http://[::1]:8081/logs",
  ];

  for (NSString *urlString in urls) {
    XCTAssertTrue([FTReactNativeUtils filterBlackResource:[NSURL URLWithString:urlString]], @"Expected %@ to be filtered", urlString);
  }
}

- (void)testDoesNotFilterApplicationResources
{
  NSArray<NSString *> *urls = @[
    @"https://api.example.com/inspector/device",
    @"http://192.168.1.20:9529/inspector/device",
    @"http://192.168.1.20:8081/business",
  ];

  for (NSString *urlString in urls) {
    XCTAssertFalse([FTReactNativeUtils filterBlackResource:[NSURL URLWithString:urlString]], @"Expected %@ not to be filtered", urlString);
  }
}

- (BOOL)findSubviewInView:(UIView *)view matching:(BOOL (^)(UIView *view))test
{
  if (test(view)) {
    return YES;
  }
  for (UIView *subview in [view subviews]) {
    if ([self findSubviewInView:subview matching:test]) {
      return YES;
    }
  }
  return NO;
}

- (void)testRendersWelcomeScreen
{
  UIViewController *vc = [[[RCTSharedApplication() delegate] window] rootViewController];
  NSDate *date = [NSDate dateWithTimeIntervalSinceNow:TIMEOUT_SECONDS];
  BOOL foundElement = NO;

  __block NSString *redboxError = nil;
#ifdef DEBUG
  RCTSetLogFunction(
      ^(RCTLogLevel level, RCTLogSource source, NSString *fileName, NSNumber *lineNumber, NSString *message) {
        if (level >= RCTLogLevelError) {
          redboxError = message;
        }
      });
#endif

  while ([date timeIntervalSinceNow] > 0 && !foundElement && !redboxError) {
    [[NSRunLoop mainRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];
    [[NSRunLoop mainRunLoop] runMode:NSRunLoopCommonModes beforeDate:[NSDate dateWithTimeIntervalSinceNow:0.1]];

    foundElement = [self findSubviewInView:vc.view
                                  matching:^BOOL(UIView *view) {
                                    if ([view.accessibilityLabel isEqualToString:TEXT_TO_LOOK_FOR]) {
                                      return YES;
                                    }
                                    return NO;
                                  }];
  }

#ifdef DEBUG
  RCTSetLogFunction(RCTDefaultLogFunction);
#endif

  XCTAssertNil(redboxError, @"RedBox error: %@", redboxError);
  XCTAssertTrue(foundElement, @"Couldn't find element with text '%@' in %d seconds", TEXT_TO_LOOK_FOR, TIMEOUT_SECONDS);
}

@end
