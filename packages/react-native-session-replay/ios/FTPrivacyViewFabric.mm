/*
 *
 *  * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 *  * This product includes software developed at Datadog (https://www.datadoghq.com/).
 *  * Copyright 2016-Present Datadog, Inc.
 *
 */
#if RCT_NEW_ARCH_ENABLED
#import <react/renderer/components/FTSessionReplayReactNative/ComponentDescriptors.h>
#import <react/renderer/components/FTSessionReplayReactNative/EventEmitters.h>
#import <react/renderer/components/FTSessionReplayReactNative/Props.h>
#import <react/renderer/components/FTSessionReplayReactNative/RCTComponentViewHelpers.h>
#import <React/RCTFabricComponentsPlugins.h>

#import "FTPrivacyViewFabric.h"
#import <objc/runtime.h>
#import <FTMobileSDK/FTSessionReplayPrivacyOverrides.h>
#import <FTMobileSDK/UIView+FTSRPrivacy.h>
#import <FTMobileSDK/FTSessionReplayPrivacyOverrides+Extension.h>
using namespace facebook::react;

@implementation FTPrivacyViewFabric

+ (ComponentDescriptorProvider)componentDescriptorProvider
{
  return concreteComponentDescriptorProvider<FTPrivacyViewComponentDescriptor>();
}

- (instancetype)init {
  if (self = [super init]) {
    static const auto defaultProps = std::make_shared<FTPrivacyViewProps const>();
    _props = defaultProps;
  }
  return self;
}

- (void)updateProps:(Props::Shared const &)props oldProps:(Props::Shared const &)oldProps {
  const auto &newProps = *std::static_pointer_cast<FTPrivacyViewProps const>(props);
  
  NSString *textAndInputPrivacy = [NSString stringWithUTF8String:newProps.textAndInputPrivacy.c_str()];
  if (textAndInputPrivacy.length > 0) {
    if ([textAndInputPrivacy isEqualToString:@"MASK_SENSITIVE_INPUTS"]) {
      self.sessionReplayPrivacyOverrides.nTextAndInputPrivacy = @0;
    } else if ([textAndInputPrivacy isEqualToString:@"MASK_ALL_INPUTS"]) {
      self.sessionReplayPrivacyOverrides.nTextAndInputPrivacy = @1;
    } else if ([textAndInputPrivacy isEqualToString:@"MASK_ALL"]) {
      self.sessionReplayPrivacyOverrides.nTextAndInputPrivacy = @2;
    }
  }
  
  
  NSString *imagePrivacy = [NSString stringWithUTF8String:newProps.imagePrivacy.c_str()];
  if (imagePrivacy.length > 0) {
    if ([imagePrivacy isEqualToString:@"MASK_NON_BUNDLED_ONLY"]) {
      self.sessionReplayPrivacyOverrides.nImagePrivacy = @0;
    } else if ([imagePrivacy isEqualToString:@"MASK_ALL"]) {
      self.sessionReplayPrivacyOverrides.nImagePrivacy = @1;
    } else if ([imagePrivacy isEqualToString:@"MASK_NONE"]) {
      self.sessionReplayPrivacyOverrides.nImagePrivacy = @2;
    }
  }
  
  
  NSString *touchPrivacy = [NSString stringWithUTF8String:newProps.touchPrivacy.c_str()];
  if (touchPrivacy.length > 0) {
    if ([touchPrivacy isEqualToString:@"SHOW"]) {
      self.sessionReplayPrivacyOverrides.nTouchPrivacy = @0;
    } else if ([touchPrivacy isEqualToString:@"HIDE"]) {
      self.sessionReplayPrivacyOverrides.nTouchPrivacy = @1;
    }
  }

  self.sessionReplayPrivacyOverrides.hide = newProps.hide;
  NSString *nativeID = [NSString stringWithUTF8String:newProps.nativeID.c_str()];
  self.nativeID = nativeID;
  [super updateProps:props oldProps:oldProps];
}

Class<RCTComponentViewProtocol> FTPrivacyViewCls(void)
{
  return FTPrivacyViewFabric.class;
}
@end
#endif
