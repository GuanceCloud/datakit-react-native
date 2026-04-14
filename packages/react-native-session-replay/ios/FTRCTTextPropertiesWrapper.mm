/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */
#import "FTRCTTextPropertiesWrapper.h"

@implementation FTRCTTextPropertiesWrapper

NSString* const RCTTextPropertiesDefaultText = @"";
NSTextAlignment const RCTTextPropertiesDefaultAlignment = NSTextAlignmentNatural;
UIColor* const RCTTextPropertiesDefaultForegroundColor = [UIColor blackColor];
CGFloat const RCTTextPropertiesDefaultFontSize = 14.0;
CGRect const RCTTextPropertiesDefaultContentRect = CGRectZero;

- (instancetype)init {
    self = [super init];
    if (self) {
        _text = RCTTextPropertiesDefaultText;
        _alignment = RCTTextPropertiesDefaultAlignment;
        _foregroundColor = RCTTextPropertiesDefaultForegroundColor;
        _fontSize = RCTTextPropertiesDefaultFontSize;
        _contentRect = RCTTextPropertiesDefaultContentRect;
    }
    return self;
}

@end
