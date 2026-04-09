/*
 *
 *  * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 *  * This product includes software developed at Datadog (https://www.datadoghq.com/).
 *  * Copyright 2016-Present Datadog, Inc.
 *
 */
#import "FTPrivacyViewPaper.h"
#import <FTMobileSDK/FTSessionReplayPrivacyOverrides.h>
#import <FTMobileSDK/UIView+FTSRPrivacy.h>
#import <FTMobileSDK/FTSessionReplayPrivacyOverrides+Extension.h>

@interface FTPrivacyView : UIView

@property (nonatomic, copy) NSString *textPrivacy;
@property (nonatomic, copy) NSString *imagePrivacy;
@property (nonatomic, copy) NSString *touchPrivacy;
@property (nonatomic, assign) BOOL hide;
@property (nonatomic, copy) NSString *nativeID;
@end

@implementation FTPrivacyView
@end

@implementation FTPrivacyViewPaper

RCT_EXPORT_MODULE(FTPrivacyView)

- (UIView *)view {
    return [[FTPrivacyView alloc] init];
}

RCT_CUSTOM_VIEW_PROPERTY(textAndInputPrivacy, NSString, FTPrivacyView) {
    NSString *value = [RCTConvert NSString:json];
    view.textPrivacy = value;
    if (value.length > 0) {
        if ([value isEqualToString:@"MASK_SENSITIVE_INPUTS"]) {
            view.sessionReplayPrivacyOverrides.nTextAndInputPrivacy = @0;
        } else if ([value isEqualToString:@"MASK_ALL_INPUTS"]) {
            view.sessionReplayPrivacyOverrides.nTextAndInputPrivacy = @1;
        } else if ([value isEqualToString:@"MASK_ALL"]) {
            view.sessionReplayPrivacyOverrides.nTextAndInputPrivacy = @2;
        }
    }
}

RCT_CUSTOM_VIEW_PROPERTY(imagePrivacy, NSString, FTPrivacyView) {
    NSString *value = [RCTConvert NSString:json];
    view.imagePrivacy = value;
    if (value.length > 0) {
        if ([value isEqualToString:@"MASK_NON_BUNDLED_ONLY"]) {
            view.sessionReplayPrivacyOverrides.nImagePrivacy = @0;
        } else if ([value isEqualToString:@"MASK_ALL"]) {
            view.sessionReplayPrivacyOverrides.nImagePrivacy = @1;
        } else if ([value isEqualToString:@"MASK_NONE"]) {
            view.sessionReplayPrivacyOverrides.nImagePrivacy = @2;
        }
    }
}

RCT_CUSTOM_VIEW_PROPERTY(touchPrivacy, NSString, FTPrivacyView) {
    NSString *value = [RCTConvert NSString:json];
    view.touchPrivacy = value;
    if (value.length > 0) {
        if ([value isEqualToString:@"SHOW"]) {
            view.sessionReplayPrivacyOverrides.nTouchPrivacy = @0;
        } else if ([value isEqualToString:@"HIDE"]) {
            view.sessionReplayPrivacyOverrides.nTouchPrivacy = @1;
        }
    }
}

RCT_CUSTOM_VIEW_PROPERTY(hide, BOOL, FTPrivacyView) {
    if (json) {
        BOOL value = [json boolValue];
        view.hide = value;
        view.sessionReplayPrivacyOverrides.hide = value;
    }
}

RCT_CUSTOM_VIEW_PROPERTY(nativeID, NSString, FTPrivacyView) {
    view.nativeID = [RCTConvert NSString:json];
}

@end
