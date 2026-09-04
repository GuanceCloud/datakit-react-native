//
//  FTReactNativeUtils.m
//  FTMobileReactNativeSDK
//
//  Created by hulilei on 2025/1/24.
//

#import "FTReactNativeUtils.h"

@implementation FTReactNativeUtils
+ (BOOL)filterBlackResource:(NSURL *)url{
    static NSRegularExpression *internalDevResourceRegex;
    static dispatch_once_t onceToken;
    dispatch_once(&onceToken, ^{
        NSString *pattern = @"^(?:https?|wss?)://(?:(?:10|172|192)(?:\\.[0-9]+){3}|localhost|127\\.0\\.0\\.1|\\[::1\\]):808[0-9]/(?:hot|symbolicate|message|inspector|status|assets|logs|debugger-proxy)(?:[/?#].*)?$";
        internalDevResourceRegex = [NSRegularExpression regularExpressionWithPattern:pattern
                                                                             options:NSRegularExpressionCaseInsensitive
                                                                               error:NULL];
    });
    NSString *absoluteString = url.absoluteString;
    if (absoluteString.length == 0) {
        return NO;
    }
    NSRange fullRange = NSMakeRange(0, absoluteString.length);
    return [internalDevResourceRegex firstMatchInString:absoluteString options:0 range:fullRange] != nil;
}
@end
