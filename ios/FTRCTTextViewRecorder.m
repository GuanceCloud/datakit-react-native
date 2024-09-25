//
//  FTRCTTextViewRecorder.m
//  FTMobileReactNativeSDK
//
//  Created by hulilei on 2024/9/25.
//

#import "FTRCTTextViewRecorder.h"
#import "RCTUIManagerUtils.h"
#import "RCTTextView.h"
#import "RCTShadowView.h"
#import "RCTRawTextShadowView.h"
#import "RCTTextShadowView.h"
#import "RCTVirtualTextShadowView.h"
#import "FTSRWireframe.h"
#import "FTViewAttributes.h"
#import "FTSRUtils.h"
#import "FTSystemColors.h"
#import "FTViewTreeRecordingContext.h"
#import "FTSRUtils.h"
#import "RCTShadowView+Layout.h"
@interface FTRCTTextViewRecorder ()
@property (nonatomic, strong) RCTUIManager *uiManager;
@end
@implementation FTRCTTextViewRecorder
-(instancetype)initWithUIManager:(RCTUIManager *)uiManager{
  self = [super init];
  if(self){
    _identifier = [[NSUUID UUID] UUIDString];
    _uiManager = uiManager;
    _textObfuscator = ^id<FTSRTextObfuscatingProtocol> _Nullable(FTViewTreeRecordingContext * _Nonnull context) {
      return context.recorder.privacy.staticTextObfuscator;
  };
  }
  return self;
}
- (nonnull FTSRNodeSemantics *)recorder:(nonnull UIView *)view attributes:(nonnull FTViewAttributes *)attributes context:(nonnull FTViewTreeRecordingContext *)context {
  if(![view isKindOfClass:[RCTTextView class]]){
    return nil;
  }
  RCTTextView *textView = (RCTTextView *)view;
  NSNumber *tag = textView.reactTag;
  
  __block RCTShadowView *shadowView = nil;
  dispatch_queue_t queue = RCTGetUIManagerQueue();
  dispatch_sync(queue, ^{
    shadowView = [self.uiManager shadowViewForReactTag:tag];
  });
  
  if([shadowView isKindOfClass:[RCTTextShadowView class]]){
    RCTTextShadowView *shadow = (RCTTextShadowView *)shadowView;
    NSString *text = [self extractTextFromSubViews:[shadowView reactSubviews]];
    FTRCTTextViewBuilder *builder = [[FTRCTTextViewBuilder alloc]init];
    builder.wireframeID = [context.viewIDGenerator SRViewID:textView nodeRecorder:self];
    builder.attributes = attributes;
    builder.text = text;
    builder.textAlignment = shadow.textAttributes.alignment;
    builder.textColor = shadow.textAttributes.foregroundColor?shadow.textAttributes.foregroundColor:[UIColor blackColor];
    builder.textObfuscator = self.textObfuscator(context);
    builder.fontSize = shadow.textAttributes.fontSize;
    builder.wireframeRect = attributes.frame;
    builder.contentRect = shadow.contentFrame;
    
    FTSpecificElement *element = [[FTSpecificElement alloc]initWithSubtreeStrategy:NodeSubtreeStrategyIgnore];
    element.nodes = @[builder];
    return element;
  }
  return [FTInvisibleElement constant];
}
- (NSString *)extractTextFromSubViews:(NSArray<RCTShadowView *>*)subViews{
  
  if(subViews.count>0){
    NSString *result = @"";
    for (id view in subViews) {
      if ([view isKindOfClass:[RCTRawTextShadowView class]]){
        RCTRawTextShadowView *textView = (RCTRawTextShadowView *)view;
        result = [result stringByAppendingString:textView.text];
      }
      if ([view isKindOfClass:[RCTVirtualTextShadowView class]]){
        NSString *str = [self extractTextFromSubViews:view];
        result = [result stringByAppendingString:str];
      }
    }
    return result;
  }
  return nil;
}
@end

@implementation FTRCTTextViewBuilder
- (nonnull NSArray<FTSRWireframe *> *)buildWireframes {
  CGRect frame = [self relativeIntersectedRect];
  FTSRTextWireframe *wireframe = [[FTSRTextWireframe alloc]initWithIdentifier:self.wireframeID frame:frame];

  wireframe.text = [self.textObfuscator mask:self.text];
  wireframe.border = [[FTSRShapeBorder alloc]initWithColor:[FTSRUtils colorHexString:self.attributes.layerBorderColor] width:self.attributes.layerBorderWidth];
  wireframe.shapeStyle = [[FTSRShapeStyle alloc]initWithBackgroundColor:[FTSRUtils colorHexString:self.attributes.backgroundColor.CGColor] cornerRadius:@(self.attributes.layerCornerRadius) opacity:@(self.attributes.alpha)];
  wireframe.textStyle = [[FTSRTextStyle alloc]initWithSize:self.fontSize?self.fontSize:14 color:[FTSRUtils colorHexString:self.textColor.CGColor] family:nil];
  FTSRTextPosition *textPosition = [[FTSRTextPosition alloc]init];
  textPosition.alignment = [[FTAlignment alloc]initWithTextAlignment:self.textAlignment vertical:@"top"];
  CGRect textFrame = [self textFrame];
  textPosition.padding = [[FTSRContentClip alloc]initWithLeft:CGRectGetMinX(frame)-CGRectGetMinX(textFrame) top:CGRectGetMinY(frame)-CGRectGetMinY(textFrame) right:CGRectGetMaxX(frame)-CGRectGetMaxX(textFrame) bottom:CGRectGetMaxY(frame)-CGRectGetMaxY(textFrame)];
  wireframe.textPosition = textPosition;
  FTSRContentClip *clip = [[FTSRContentClip alloc]initWithLeft:0 top:-1 right:0 bottom:0];
  wireframe.clip = clip;
  return @[wireframe];
}

- (CGRect)relativeIntersectedRect{
  return CGRectMake(self.attributes.frame.origin.x, self.attributes.frame.origin.y, MAX(self.contentRect.size.width, self.attributes.frame.size.width), MAX(self.contentRect.size.height, self.attributes.frame.size.height));
}
- (CGRect)textFrame{
  return CGRectMake(self.attributes.frame.origin.x+self.contentRect.origin.x, self.attributes.frame.origin.y+self.contentRect.origin.y, self.contentRect.size.width, self.contentRect.size.height);
}
@end



