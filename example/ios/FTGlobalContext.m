//
//  FTGlobalContext.m
//  FtMobileAgentExample
//
//  Created by hulilei on 2022/1/7.
//

#import "FTGlobalContext.h"
#import <React/RCTConvert.h>
//Target -> Build Settings -> GCC_PREPROCESSOR_DEFINITIONS 进行配置预设定义
#if PREPROD
#define STATIC_TAG     @"preprod"
#else
#define STATIC_TAG     @"formal"
#endif
@implementation FTGlobalContext
RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(getGlobalContext:(RCTResponseSenderBlock)callback)
{
  
  callback(@[[NSNull null],@{@"track_id":STATIC_TAG}]);
}
@end
