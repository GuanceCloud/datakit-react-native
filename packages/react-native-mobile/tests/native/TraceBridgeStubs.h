// Minimal dependencies for executing the production Trace bridge on macOS.
// The real RN/Guance headers are checked separately by run-websocket-bridge.py.
#pragma once
#import <Foundation/Foundation.h>

typedef void (^RCTPromiseResolveBlock)(id);
typedef void (^RCTPromiseRejectBlock)(NSString *, NSString *, NSError *);
@protocol RCTBridgeModule <NSObject> @end
#define RCT_EXPORT_MODULE(...)
#define RCT_REMAP_METHOD(name, ...) - (void)__VA_ARGS__
#define RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(method) - (id)method

@protocol FTExternalResourceProtocol <NSObject>
@optional
- (NSDictionary *)getTraceHeaderWithKey:(NSString *)key url:(NSURL *)url;
- (NSDictionary *)getTraceHeaderWithUrl:(NSURL *)url;
@end
@interface FTExternalDataManager : NSObject
@property (nonatomic, weak) id<FTExternalResourceProtocol> resourceDelegate;
+ (instancetype)sharedManager;
- (NSDictionary *)getTraceHeaderWithUrl:(NSURL *)url;
@end

typedef NSInteger FTNetworkTraceType;
@interface FTTraceConfig : NSObject
@property (nonatomic) double sampleRate;
@property (nonatomic) FTNetworkTraceType networkTraceType;
@property (nonatomic) BOOL enableLinkRumData;
@property (nonatomic) BOOL enableAutoTrace;
@end
@interface FTMobileAgent : NSObject
+ (instancetype)sharedInstance;
- (void)startTraceWithConfigOptions:(FTTraceConfig *)config;
@end
@interface RCTConvert : NSObject
+ (double)double:(id)value;
+ (int)int:(id)value;
+ (BOOL)BOOL:(id)value;
@end
