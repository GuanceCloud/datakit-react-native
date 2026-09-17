#import "SceneDelegate.h"

#import "AppDelegate.h"
#import <React/RCTConstants.h>

@implementation SceneDelegate

- (void)scene:(UIScene *)scene
    willConnectToSession:(UISceneSession *)session
                 options:(UISceneConnectionOptions *)connectionOptions
{
  if (![scene isKindOfClass:[UIWindowScene class]]) {
    return;
  }

  AppDelegate *appDelegate = (AppDelegate *)UIApplication.sharedApplication.delegate;
  [appDelegate bootstrapReactNativeWithWindowScene:(UIWindowScene *)scene];
  self.window = appDelegate.window;
}

- (void)windowScene:(UIWindowScene *)windowScene
    didUpdateCoordinateSpace:(id<UICoordinateSpace>)previousCoordinateSpace
        interfaceOrientation:(UIInterfaceOrientation)previousInterfaceOrientation
             traitCollection:(UITraitCollection *)previousTraitCollection
{
  AppDelegate *appDelegate = (AppDelegate *)UIApplication.sharedApplication.delegate;
  [[NSNotificationCenter defaultCenter] postNotificationName:RCTWindowFrameDidChangeNotification
                                                      object:appDelegate];
}

@end
