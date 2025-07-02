//
//  FTReactNativeUtils.m
//  FTMobileReactNativeSDK
//
//  Created by hulilei on 2025/1/24.
//

#import "FTReactNativeUtils.h"

@implementation FTReactNativeUtils
+ (BOOL)filterBlackResource:(NSURL *)url{
    static NSMutableArray *internalDevResourceBlacklist;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        internalDevResourceBlacklist = [NSMutableArray new];
        NSError *error = nil;
        NSString *pattern = @"^http://((10|172|192).[0-9]+.[0-9]+.[0-9]+|localhost|127.0.0.1):808[0-9]/logs$";
        NSRegularExpression * regularExpress = [NSRegularExpression regularExpressionWithPattern:pattern options:NSRegularExpressionCaseInsensitive error:&error];
        [internalDevResourceBlacklist addObject:regularExpress];
        NSString *rn = @"^http://localhost:808[0-9]/(hot|symbolicate|message|inspector|status|assets).*$";
        NSRegularExpression * rnRegularExpress = [NSRegularExpression regularExpressionWithPattern:rn options:NSRegularExpressionCaseInsensitive error:&error];
        [internalDevResourceBlacklist addObject:rnRegularExpress];
    });
    for (NSRegularExpression *regex in internalDevResourceBlacklist) {
        NSTextCheckingResult *firstMatch =[regex firstMatchInString:url.absoluteString options:0 range:NSMakeRange(0, [url.absoluteString length])];
        if (firstMatch) {
            return YES;
        }
    }
    return NO;
}
@end
