//
//  FTRCTTextViewRecorder.h
//  FTMobileReactNativeSDK
//
//  Created by hulilei on 2024/9/25.
//

#import <Foundation/Foundation.h>
#import "FTSRWireframesBuilder.h"
#import "RCTUIManager.h"
@class FTViewAttributes,FTViewTreeRecorder;
NS_ASSUME_NONNULL_BEGIN

@interface FTRCTTextViewBuilder : NSObject<FTSRWireframesBuilder>
@property (nonatomic, strong) FTViewAttributes *attributes;
@property (nonatomic, assign) CGRect wireframeRect;
@property (nonatomic, assign) int wireframeID;
@property (nonatomic, strong) UIColor * backgroundColor;
@property (nonatomic, assign) NSTextAlignment textAlignment;
@property (nonatomic, strong) UIColor *textColor;
@property (nonatomic,assign) CGFloat fontSize;
@property (nonatomic,assign) CGRect contentRect;
@property (nonatomic, strong) id<FTSRTextObfuscatingProtocol> textObfuscator;

@property (nonatomic, copy) NSString *text;
@end

@interface FTRCTTextViewRecorder : NSObject<FTSRWireframesRecorder>
@property (nonatomic, copy) NSString *identifier;
@property (nonatomic,copy) FTTextObfuscator textObfuscator;
-(instancetype)initWithUIManager:(RCTUIManager *)uiManager;
@end
NS_ASSUME_NONNULL_END
