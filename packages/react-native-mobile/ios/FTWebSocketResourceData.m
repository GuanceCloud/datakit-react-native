#import "FTWebSocketResourceData.h"
#import <objc/message.h>
#include <math.h>
#include <string.h>
#include <stdint.h>

static BOOL FTWebSocketEpochNanoseconds(id value, int64_t *result) {
  if (![value isKindOfClass:NSString.class]) return NO;
  NSString *text = value;
  if (text.length == 0 || text.length > 19 || [text characterAtIndex:0] == '0') return NO;
  int64_t number = 0;
  for (NSUInteger index = 0; index < text.length; index++) {
    unichar character = [text characterAtIndex:index];
    if (character < '0' || character > '9') return NO;
    int digit = character - '0';
    if (number > (INT64_MAX - digit) / 10) return NO;
    number = number * 10 + digit;
  }
  *result = number;
  return YES;
}

BOOL FTWebSocketResourceInterval(NSDictionary *metrics, int64_t *start, int64_t *end) {
  int64_t startNs, endNs;
  if (!FTWebSocketEpochNanoseconds(metrics[@"fetchStartNsTimeInterval"], &startNs) ||
      !FTWebSocketEpochNanoseconds(metrics[@"fetchEndNsTimeInterval"], &endNs) || endNs < startNs) return NO;
  *start = startNs;
  *end = endNs;
  return YES;
}

BOOL FTWebSocketDiscardTraceResource(id interceptor, NSString *key) {
  if (!interceptor || !key.length) return NO;
  // Guance's current cancellation primitive is not in its public header.
  // Validate the ABI before calling it; no swizzle, KVC, or unknown ivar reads.
  // Compatibility with a different native SDK must include this capability.
  SEL selector = NSSelectorFromString(@"removeTraceHandlerWithKey:");
  @try {
    if (![interceptor respondsToSelector:selector]) return NO;
    NSMethodSignature *signature = [interceptor methodSignatureForSelector:selector];
    if (!signature || signature.numberOfArguments != 3 ||
        strcmp(signature.methodReturnType, @encode(void)) != 0 ||
        strcmp([signature getArgumentTypeAtIndex:2], @encode(id)) != 0) return NO;
    ((void (*)(id, SEL, id))objc_msgSend)(interceptor, selector, key);
    return YES;
  } @catch (__unused NSException *exception) { return NO; }
}

BOOL FTWebSocketShouldCollectResource(NSURL *url, BOOL (^resourceUrlHandler)(NSURL *),
                                     BOOL (^intakeUrlHandler)(NSURL *)) {
  if (resourceUrlHandler || intakeUrlHandler) {
    if (!url) return NO;
    if (resourceUrlHandler) return !resourceUrlHandler(url);
    return intakeUrlHandler(url);
  }
  return YES;
}

static NSNumber *FTHTTPStatus(NSDictionary *metadata, NSString *message) {
  id status = metadata[@"httpStatus"];
  if ([status isKindOfClass:NSNumber.class]) {
    double value = [status doubleValue];
    if (isfinite(value) && value == floor(value)) return status;
  }
  if (![message isKindOfClass:NSString.class] || message.length > 512) return nil;
  static NSRegularExpression *pattern;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    pattern = [NSRegularExpression regularExpressionWithPattern:
      @"\\AReceived\\s+bad\\s+response\\s+code\\s+from\\s+server\\s*:\\s*([1-9][0-9]{2})\\s*\\.?\\z"
      options:NSRegularExpressionCaseInsensitive error:nil];
  });
  NSString *text = [message stringByTrimmingCharactersInSet:NSCharacterSet.whitespaceAndNewlineCharacterSet];
  NSTextCheckingResult *match = [pattern firstMatchInString:text options:0 range:NSMakeRange(0, text.length)];
  return match ? @([[text substringWithRange:[match rangeAtIndex:1]] integerValue]) : nil;
}

NSDictionary *FTWebSocketResourceData(NSDictionary *content, NSDictionary *metrics,
                                    NSDictionary *metadata, NSString *event) {
  BOOL success = [event isEqualToString:@"open"];
  NSString *message = [content[@"errorMessage"] isKindOfClass:NSString.class] ? content[@"errorMessage"] : nil;
  // Keep absence separate from the exported unknown value 0. A native HTTP
  // response takes precedence over text, without restricting its status class.
  NSNumber *status = FTHTTPStatus(metadata, success ? nil : message);
  NSMutableDictionary *resource = [NSMutableDictionary new];
  for (NSString *key in @[@"url", @"httpMethod", @"requestHeader"]) {
    if (content[key]) resource[key] = content[key];
  }
  resource[@"resourceType"] = @"websocket";
  resource[@"webSocketHandshake"] = @YES;
  resource[@"resourceStatus"] = status ?: @0;
  resource[@"webSocketHandshakeState"] = success ? @"success" : (status && ![status isEqualToNumber:@101] ? @"rejected" : @"failed");
  if (!success && message.length) resource[@"errorMessage"] = message;
  if ([metadata[@"responseHeader"] isKindOfClass:NSDictionary.class]) resource[@"responseHeader"] = metadata[@"responseHeader"];
  NSMutableDictionary *resultMetrics = [NSMutableDictionary new];
  id duration = metrics[@"duration"];
  if ([duration isKindOfClass:NSNumber.class] && isfinite([duration doubleValue]) && [duration doubleValue] >= 0)
    resultMetrics[@"duration"] = duration; // JS event-boundary duration, already in nanoseconds.
  int64_t startNs, endNs;
  if (FTWebSocketResourceInterval(metrics, &startNs, &endNs)) {
    resultMetrics[@"fetchStartNsTimeInterval"] = metrics[@"fetchStartNsTimeInterval"];
    resultMetrics[@"fetchEndNsTimeInterval"] = metrics[@"fetchEndNsTimeInterval"];
  }
  if ([metadata[@"httpProtocol"] isKindOfClass:NSString.class]) resultMetrics[@"resource_http_protocol"] = metadata[@"httpProtocol"];
  return @{@"content": resource, @"metrics": resultMetrics};
}
