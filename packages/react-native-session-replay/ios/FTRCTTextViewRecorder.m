/*
 * Unless explicitly stated otherwise all files in this repository are licensed under the Apache License Version 2.0.
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2016-Present Datadog, Inc.
 */

#import "FTRCTTextViewRecorder.h"
#import <React/RCTUIManagerUtils.h>
#import <React/RCTTextView.h>
#import <React/RCTShadowView.h>
#import <React/RCTRawTextShadowView.h>
#import <React/RCTTextShadowView.h>
#import <React/RCTVirtualTextShadowView.h>
#import <FTMobileSDK/FTSRWireframe.h>
#import <FTMobileSDK/FTViewAttributes.h>
#import <FTMobileSDK/FTSRUtils.h>
#import <FTMobileSDK/FTSystemColors.h>
#import <FTMobileSDK/FTViewTreeRecordingContext.h>
#import <FTMobileSDK/FTSRUtils.h>
#import <React/RCTShadowView+Layout.h>
#import "FTRCTFabricWrapper.h"

@interface FTRCTTextViewRecorder ()
@property (nonatomic, strong) RCTUIManager *uiManager;
@property (nonatomic, strong) FTRCTFabricWrapper *fabricWrapper;
@end
@implementation FTRCTTextViewRecorder
-(instancetype)initWithUIManager:(RCTUIManager *)uiManager{
  self = [super init];
  if(self){
    _identifier = [[NSUUID UUID] UUIDString];
    _uiManager = uiManager;
    _fabricWrapper = [FTRCTFabricWrapper new];
    _textObfuscator = ^id<FTSRTextObfuscatingProtocol> _Nullable(FTViewTreeRecordingContext * _Nonnull context,FTViewAttributes *attributes) {
      return [FTSRTextObfuscatingFactory staticTextObfuscator:[attributes resolveTextAndInputPrivacyLevel:context.recorder]];
    };
  }
  return self;
}
- (FTSRNodeSemantics *)recorder:(nonnull UIView *)view attributes:(nonnull FTViewAttributes *)attributes context:(nonnull FTViewTreeRecordingContext *)context{
  FTRCTTextPropertiesWrapper *textProperties = [self.fabricWrapper tryToExtractTextPropertiesFromView:view]?:[self tryToExtractTextProperties:view];
  if (!textProperties) {
    return [view isKindOfClass:RCTTextView.class] ? [FTInvisibleElement constant] : nil;
  }
  FTRCTTextViewBuilder *builder =  [[FTRCTTextViewBuilder alloc]init];
  builder.wireframeID = [context.viewIDGenerator SRViewID:view nodeRecorder:self];
  builder.attributes = attributes;
  builder.text = textProperties.text;
  builder.textAlignment = textProperties.alignment;
  builder.textColor = textProperties.foregroundColor;
  builder.textObfuscator = self.textObfuscator(context,attributes);
  builder.fontSize = textProperties.fontSize;
  builder.wireframeRect = attributes.frame;
  builder.contentRect = textProperties.contentRect;
  FTSpecificElement *element = [[FTSpecificElement alloc]initWithSubtreeStrategy:NodeSubtreeStrategyIgnore];
  element.nodes = @[builder];
  return element;
}
- (NSString *)extractTextFromSubViews:(NSArray<RCTShadowView *>*)subViews{
  if(subViews && subViews.count>0){
    NSString *result = @"";
    for (id view in subViews) {
      if ([view isKindOfClass:[RCTRawTextShadowView class]]){
        RCTRawTextShadowView *textView = (RCTRawTextShadowView *)view;
        if (textView.text) {
          result = [result stringByAppendingString:textView.text];
        }
      }
      if ([view isKindOfClass:[RCTVirtualTextShadowView class]]){
        NSString *str = [self extractTextFromSubViews:[view reactSubviews]];
        if (str) {
          result = [result stringByAppendingString:str];
        }
      }
    }
    return result;
  }
  return nil;
}
- (nullable NSString *)tryToExtractTextFromSubViews:(nullable NSArray<RCTShadowView *> *)subviews {
    if (!subviews) {
        return nil;
    }
    
    NSMutableString *result = [NSMutableString new];
    for (RCTShadowView *subview in subviews) {
        if ([subview isKindOfClass:[RCTRawTextShadowView class]]) {
            NSString *text = [(RCTRawTextShadowView *)subview text];
            if (text) {
                [result appendString:text];
            }
        } else if ([subview isKindOfClass:[RCTVirtualTextShadowView class]]) {
            NSString *nestedText = [self tryToExtractTextFromSubViews:[(RCTVirtualTextShadowView *)subview reactSubviews]];
            if (nestedText) {
                [result appendString:nestedText];
            }
        }
    }
    
    return result.length > 0 ? [result copy] : nil;
}
-(FTRCTTextPropertiesWrapper *)tryToExtractTextProperties:(UIView *)view{
  if (![view isKindOfClass:RCTTextView.class]) {
    return nil;
  }
  RCTTextView *textView = (RCTTextView *)view;
  __block RCTTextShadowView *shadowView = nil;
  NSNumber *tag = textView.reactTag;
  dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
  NSTimeInterval timeout = 0.2;
  
  dispatch_async(RCTGetUIManagerQueue(), ^{
    RCTShadowView *sView = [self.uiManager shadowViewForReactTag:tag];
    if ([sView isKindOfClass:[RCTTextShadowView class]]) {
      shadowView = (RCTTextShadowView *)sView;
    }
    dispatch_semaphore_signal(semaphore);
  });
  
  dispatch_time_t waitTime = dispatch_time(DISPATCH_TIME_NOW, (int64_t)(timeout * NSEC_PER_SEC));
  if (dispatch_semaphore_wait(semaphore, waitTime) != 0) {
    return nil;
  }
  if (!shadowView) {
    return nil;
  }
  
  FTRCTTextPropertiesWrapper *textProperties = [FTRCTTextPropertiesWrapper new];
  NSString *extractedText = [self tryToExtractTextFromSubViews:shadowView.reactSubviews];
  if (extractedText) {
    textProperties.text = extractedText;
  }
  
  if (shadowView.textAttributes.foregroundColor) {
    textProperties.foregroundColor = shadowView.textAttributes.foregroundColor;
  }
  
  textProperties.alignment = shadowView.textAttributes.alignment;
  textProperties.fontSize = shadowView.textAttributes.fontSize;
  textProperties.contentRect = shadowView.contentFrame;
  return textProperties;
}
@end

@implementation FTRCTTextViewBuilder
- (nonnull NSArray<FTSRWireframe *> *)buildWireframesWithBuilder:(nonnull FTSessionReplayWireframesBuilder *)builder {
  CGRect frame = [self relativeIntersectedRect];
  FTSRTextWireframe *wireframe = [[FTSRTextWireframe alloc]initWithIdentifier:self.wireframeID frame:frame];
  
  wireframe.text = [self.textObfuscator mask:self.text];
  wireframe.border = [[FTSRShapeBorder alloc]initWithColor:[FTSRUtils colorHexString:self.attributes.layerBorderColor] width:self.attributes.layerBorderWidth];
  wireframe.shapeStyle = [[FTSRShapeStyle alloc]initWithBackgroundColor:[FTSRUtils colorHexString:self.attributes.backgroundColor.CGColor] cornerRadius:@(self.attributes.layerCornerRadius) opacity:@(self.attributes.alpha)];
  wireframe.textStyle = [[FTSRTextStyle alloc]initWithSize:self.fontSize?self.fontSize:RCTTextPropertiesDefaultFontSize color:[FTSRUtils colorHexString:self.textColor.CGColor] family:nil];
  FTSRTextPosition *textPosition = [[FTSRTextPosition alloc]init];
  textPosition.alignment = [[FTAlignment alloc]initWithTextAlignment:self.textAlignment vertical:@"top"];
  CGRect textFrame = [self textFrame];
  textPosition.padding = [[FTPadding alloc]initWithLeft:CGRectGetMinX(textFrame)-CGRectGetMinX(frame) top:CGRectGetMinY(textFrame)-CGRectGetMinY(frame) right:CGRectGetMaxX(frame)-CGRectGetMaxX(textFrame) bottom:CGRectGetMaxY(frame)-CGRectGetMaxY(textFrame)];
  wireframe.textPosition = textPosition;
  wireframe.clip = [[FTSRContentClip alloc] initWithFrame:self.wireframeRect clip:self.attributes.clip];;
  return @[wireframe];
}

- (CGRect)relativeIntersectedRect{
  return CGRectMake(self.attributes.frame.origin.x, self.attributes.frame.origin.y, MAX(self.contentRect.size.width, self.attributes.frame.size.width), MAX(self.contentRect.size.height, self.attributes.frame.size.height));
}
- (CGRect)textFrame{
  return CGRectMake(self.attributes.frame.origin.x+self.contentRect.origin.x, self.attributes.frame.origin.y+self.contentRect.origin.y, self.contentRect.size.width, self.contentRect.size.height);
}
@end



