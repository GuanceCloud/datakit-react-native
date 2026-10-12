#!/usr/bin/env python3
"""Execute production config bridge methods with SDK/RN test doubles (no smoke)."""
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[4]


def method(path, signature):
    source = (ROOT / path).read_text()
    start = source.index(signature)
    brace = source.index('{', start)
    end, depth = brace + 1, 1
    while depth:
        depth += (source[end] == '{') - (source[end] == '}')
        end += 1
    return source[start:end]


def sampling_region(path, start, end):
    source = (ROOT / path).read_text()
    return source[source.index(start):source.index(end, source.index(start))]


def run_ios(tmp):
    log = method('packages/react-native-mobile/ios/FTReactNativeLog.mm', '- (void)logConfig:')
    replay = method('packages/react-native-session-replay/ios/FTReactNativeSessionReplay.mm', '- (void)sessionReplayConfig:')
    rum_sampling = sampling_region('packages/react-native-mobile/ios/FTReactNativeRUM.mm', '  if ([context.allKeys containsObject:@"sessionSamplingRate"])', '  if ([context.allKeys containsObject:@"enableNativeUserAction"])')
    trace_sampling = sampling_region('packages/react-native-mobile/ios/FTReactNativeTrace.mm', '  if ([context.allKeys containsObject:@"traceSamplingRate"])', '  if ([context.allKeys containsObject:@"traceType"])')
    source = r'''
#import <Foundation/Foundation.h>
#include <math.h>
typedef void (^RCTPromiseResolveBlock)(id);
typedef void (^RCTPromiseRejectBlock)(NSString *, NSString *, NSError *);
typedef int FTLogCacheDiscard;
typedef int FTSRPrivacy;
enum { FTTouchPrivacyLevelShow, FTTouchPrivacyLevelHide,
  FTTextAndInputPrivacyLevelMaskAllInputs, FTTextAndInputPrivacyLevelMaskAll,
  FTImagePrivacyLevelMaskNonBundledOnly, FTImagePrivacyLevelMaskAll, FTImagePrivacyLevelMaskNone };
@interface RCTConvert : NSObject
+ (double)double:(id)v;
+ (int)int:(id)v;
+ (BOOL)BOOL:(id)v;
+ (id)NSNumberArray:(id)v;
+ (id)NSDictionary:(id)v;
+ (id)NSString:(id)v;
@end
@implementation RCTConvert
+ (double)double:(id)v { return [v doubleValue]; }
+ (int)int:(id)v { return [v intValue]; }
+ (BOOL)BOOL:(id)v { return [v boolValue]; }
+ (id)NSNumberArray:(id)v { return v; }
+ (id)NSDictionary:(id)v { return v; }
+ (id)NSString:(id)v { return v; }
@end
@interface SamplingConfig : NSObject
@property float sessionSamplingRate, sessionOnErrorSamplingRate, traceSamplingRate;
@end
@implementation SamplingConfig
- (instancetype)init { if ((self = [super init])) { _sessionSamplingRate = 100; _traceSamplingRate = 100; } return self; }
@end
@interface FTLoggerConfig : NSObject
@property float logSamplingRate;
@property (nonatomic) int sampleRate, discardType, logCacheLimitCount;
@property BOOL enableCustomLog, enableLinkRumData, enableWebViewLog;
@property id logLevelFilter, globalContext;
@end
@implementation FTLoggerConfig
- (instancetype)init { if ((self = [super init])) _logSamplingRate = 100; return self; }
- (void)setSampleRate:(int)v { _logSamplingRate = v; }
@end
@interface FTSessionReplayConfig : NSObject
@property float sessionReplaySamplingRate, sessionReplayOnErrorSamplingRate;
@property (nonatomic) int sampleRate, sessionReplayOnErrorSampleRate, privacy, touchPrivacy, textAndInputPrivacy, imagePrivacy;
@property id enableLinkRUMKeys;
- (void)setAdditionalNodeRecorders:(id)v;
@end
@implementation FTSessionReplayConfig
- (instancetype)init { if ((self = [super init])) _sessionReplaySamplingRate = 100; return self; }
- (void)setSampleRate:(int)v { _sessionReplaySamplingRate = v; }
- (void)setSessionReplayOnErrorSampleRate:(int)v { _sessionReplayOnErrorSamplingRate = v; }
- (void)setAdditionalNodeRecorders:(id)v {}
@end
static FTLoggerConfig *lastLog;
static FTSessionReplayConfig *lastReplay;
@interface FTMobileAgent : NSObject
+ (instancetype)sharedInstance;
- (void)startLoggerWithConfigOptions:(FTLoggerConfig *)v;
@end
@implementation FTMobileAgent
+ (instancetype)sharedInstance { return [self new]; }
- (void)startLoggerWithConfigOptions:(FTLoggerConfig *)v { lastLog = v; }
@end
@interface FTRumSessionReplay : NSObject
+ (instancetype)sharedInstance;
- (void)startWithSessionReplayConfig:(FTSessionReplayConfig *)v;
@end
@implementation FTRumSessionReplay
+ (instancetype)sharedInstance { return [self new]; }
- (void)startWithSessionReplayConfig:(FTSessionReplayConfig *)v { lastReplay = v; }
@end
@interface FTRCTTextViewRecorder : NSObject
- (instancetype)initWithUIManager:(id)v;
@end
@implementation FTRCTTextViewRecorder
- (instancetype)initWithUIManager:(id)v { return [super init]; }
@end
@interface TestBridge : NSObject
@property id uiManager;
@end
@implementation TestBridge @end
@interface ConfigBridge : NSObject { TestBridge *_bridge; }
@end
@implementation ConfigBridge
''' + log + '\n' + replay + '\n- (void)rumSampling:(NSDictionary *)context config:(SamplingConfig *)rumConfig {\n' + rum_sampling + '}\n- (void)traceSampling:(NSDictionary *)context config:(SamplingConfig *)trace {\n' + trace_sampling + '}\n' + r'''
@end
static int failures;
static void check(double actual, double expected) {
  if (fabs(actual - expected) > 0.00001) {
    NSLog(@"Expected %.8g, got %.8g", expected, actual); failures++;
  }
}
int main() { @autoreleasepool {
  ConfigBridge *bridge = [ConfigBridge new];
  __block int resolved = 0;
  RCTPromiseResolveBlock resolve = ^(id v) { resolved++; };
  RCTPromiseRejectBlock reject = ^(NSString *c, NSString *m, NSError *e) { exit(2); };
  NSArray *rates = @[@0, @0.001, @0.125, @1];
  NSArray *percentages = @[@0, @0.1, @12.5, @100];
  for (NSUInteger i = 0; i < rates.count; i++) {
    [bridge logConfig:@{@"sampleRate": rates[i], @"enableWebViewLog": @YES} resolve:resolve reject:reject];
    check(lastLog.logSamplingRate, [percentages[i] doubleValue]);
    check(lastLog.enableWebViewLog, YES);
    [bridge sessionReplayConfig:@{@"sampleRate": rates[i], @"sessionReplayOnErrorSampleRate": rates[i]} resolve:resolve reject:reject];
    check(lastReplay.sessionReplaySamplingRate, [percentages[i] doubleValue]);
    check(lastReplay.sessionReplayOnErrorSamplingRate, [percentages[i] doubleValue]);
  }
  [bridge logConfig:@{@"enableWebViewLog": @NO} resolve:resolve reject:reject];
  check(lastLog.enableWebViewLog, NO);
  check(lastLog.logSamplingRate, 100);
  [bridge logConfig:@{} resolve:resolve reject:reject];
  check(lastLog.enableWebViewLog, NO);
  [bridge sessionReplayConfig:@{} resolve:resolve reject:reject];
  check(lastReplay.sessionReplaySamplingRate, 100);
  check(lastReplay.sessionReplayOnErrorSamplingRate, 0);
  [bridge sessionReplayConfig:@{@"sampleRate": @0.125} resolve:resolve reject:reject];
  check(lastReplay.sessionReplaySamplingRate, 12.5);
  check(lastReplay.sessionReplayOnErrorSamplingRate, 0);
  [bridge sessionReplayConfig:@{@"sessionReplayOnErrorSampleRate": @0.001} resolve:resolve reject:reject];
  check(lastReplay.sessionReplaySamplingRate, 100);
  check(lastReplay.sessionReplayOnErrorSamplingRate, 0.1);
  for (NSNumber *percentage in @[@0, @0.1, @12.5, @100]) {
    [bridge logConfig:@{@"sampleRate": @1, @"logSamplingRate": percentage} resolve:resolve reject:reject];
    check(lastLog.logSamplingRate, percentage.doubleValue);
    [bridge sessionReplayConfig:@{@"sampleRate": @1, @"sessionReplayOnErrorSampleRate": @1,
      @"sessionReplaySamplingRate": percentage, @"sessionReplayOnErrorSamplingRate": percentage} resolve:resolve reject:reject];
    check(lastReplay.sessionReplaySamplingRate, percentage.doubleValue);
    check(lastReplay.sessionReplayOnErrorSamplingRate, percentage.doubleValue);
  }
  check(resolved, 21);
  for (NSNumber *percentage in @[@0, @0.1, @12.5, @100]) {
    for (int includeLegacy = 0; includeLegacy <= 1; includeLegacy++) {
      NSMutableDictionary *context = [@{@"sessionSamplingRate": percentage, @"sessionOnErrorSamplingRate": percentage, @"traceSamplingRate": percentage} mutableCopy];
      if (includeLegacy) { context[@"sampleRate"] = @1; context[@"sessionOnErrorSampleRate"] = @1; }
      SamplingConfig *config = [SamplingConfig new];
      [bridge rumSampling:context config:config]; [bridge traceSampling:context config:config];
      check(config.sessionSamplingRate, percentage.doubleValue); check(config.sessionOnErrorSamplingRate, percentage.doubleValue); check(config.traceSamplingRate, percentage.doubleValue);
    }
  }
  SamplingConfig *config = [SamplingConfig new];
  [bridge rumSampling:@{@"sampleRate": @0.001, @"sessionOnErrorSampleRate": @0.125} config:config];
  [bridge traceSampling:@{@"sampleRate": @0.001} config:config];
  check(config.sessionSamplingRate, 0.1); check(config.sessionOnErrorSamplingRate, 12.5); check(config.traceSamplingRate, 0.1);
  config = [SamplingConfig new]; [bridge rumSampling:@{} config:config]; [bridge traceSampling:@{} config:config];
  check(config.sessionSamplingRate, 100); check(config.sessionOnErrorSamplingRate, 0); check(config.traceSamplingRate, 100);
  if (failures) return 1;
  puts("iOS config bridge: 0, 0.1, 12.5, 100 percent; WebView true/false/omitted; defaults PASS");
} }
'''
    file = tmp / 'config-tests.mm'
    file.write_text(source)
    subprocess.run(['xcrun', 'clang++', '-fobjc-arc', '-fblocks', '-framework', 'Foundation', str(file), '-o', str(tmp / 'config-tests')], check=True)
    subprocess.run([str(tmp / 'config-tests')], check=True)


def run_android(tmp):
    def write(name, body):
        file = tmp / (name.replace('.', '/') + '.java')
        file.parent.mkdir(parents=True, exist_ok=True)
        package, _, cls = name.rpartition('.')
        file.write_text('package ' + package + ';\n' + body.replace('$CLASS', cls))

    write('com.facebook.react.bridge.ReactMethod', 'public @interface $CLASS {}')
    write('com.facebook.react.bridge.Promise', 'public interface $CLASS { void resolve(Object v); }')
    write('com.facebook.react.bridge.ReadableMap', 'public interface $CLASS { java.util.HashMap<String,Object> toHashMap(); }')
    write('com.facebook.react.bridge.ReadableArray', 'public interface $CLASS { int size(); String getString(int i); }')
    write('com.facebook.react.bridge.ReactContext', 'public class $CLASS {}')
    for pkg in ['com.ft.sdk.reactnative.utils', 'com.ft.sdk.reactnative.sessionreplay.utils']:
        write(pkg + '.ReactNativeUtils', 'public class $CLASS { public static Integer convertToNativeInt(Object v) { return v == null ? null : ((Number)v).intValue(); } }')
    for name, values in [('LogCacheDiscard', 'DISCARD,DISCARD_OLDEST'), ('garble.bean.Status', 'INFO,DEBUG,WARNING,ERROR,CRITICAL,OK'), ('sessionreplay.SessionReplayPrivacy', 'MASK,ALLOW,MASK_USER_INPUT'), ('sessionreplay.TouchPrivacy', 'SHOW,HIDE'), ('sessionreplay.TextAndInputPrivacy', 'MASK_SENSITIVE_INPUTS,MASK_ALL_INPUTS,MASK_ALL'), ('sessionreplay.ImagePrivacy', 'MASK_LARGE_ONLY,MASK_ALL,MASK_NONE')]:
        write('com.ft.sdk.' + name, 'public enum $CLASS {' + values + '}')
    write('com.ft.sdk.FTLoggerConfig', '''public class $CLASS {
public float percentage = 100; public boolean webView = false;
public $CLASS setSamplingRate(float v) { percentage = v * 100; return this; }
public $CLASS setLogSamplingRate(float v) { percentage = v; return this; }
public $CLASS setEnableWebViewLog(boolean v) { webView = v; return this; }
public $CLASS setLogCacheDiscardStrategy(LogCacheDiscard v) { return this; }
public void setLogLevelFilters(com.ft.sdk.garble.bean.Status[] v) {}
public void setEnableLinkRumData(boolean v) {} public void setEnableCustomLog(boolean v) {}
public void addGlobalContext(String k, String v) {} public void setLogCacheLimitCount(int v) {}
}''')
    write('com.ft.sdk.FTLogger', '''public class $CLASS {
public static $CLASS getInstance() { return new $CLASS(); }
public void logBackground(String c, Object s) {} public void logBackground(String c, Object s, Object p) {}
}''')
    write('com.ft.sdk.FTSdk', '''public class $CLASS {
public static FTLoggerConfig log;
public static com.ft.sdk.sessionreplay.FTSessionReplayConfig replay;
public static void initLogWithConfig(FTLoggerConfig v) { log = v; }
public static void initSessionReplayConfig(com.ft.sdk.sessionreplay.FTSessionReplayConfig v) { replay = v; }
}''')
    write('com.ft.sdk.SessionReplayManager', 'public class $CLASS { public static $CLASS get() { return new $CLASS(); } public Object getInternalLogger() { return null; } }')
    write('com.ft.sdk.reactnative.sessionreplay.utils.text.TextViewUtils', 'public class $CLASS { public static $CLASS create(Object c,Object l) { return new $CLASS(); } }')
    write('com.ft.sdk.reactnative.sessionreplay.ReactNativeSessionReplayExtensionSupport', 'public class $CLASS { public $CLASS(Object v) {} }')
    write('com.ft.sdk.sessionreplay.FTSessionReplayConfig', '''public class $CLASS {
public float percentage = 100, errorPercentage = 0;
public $CLASS setSampleRate(float v) { percentage = v * 100; return this; }
public $CLASS setSessionReplayOnErrorSampleRate(float v) { errorPercentage = v * 100; return this; }
public $CLASS setSessionReplaySamplingRate(float v) { percentage = v; return this; }
public $CLASS setSessionReplayOnErrorSamplingRate(float v) { errorPercentage = v; return this; }
public void setPrivacy(SessionReplayPrivacy v) {} public void setTouchPrivacy(TouchPrivacy v) {}
public void setTextAndInputPrivacy(TextAndInputPrivacy v) {} public void setImagePrivacy(ImagePrivacy v) {}
public void enableLinkRUMKeys(String[] v) {}
public $CLASS addExtensionSupport(Object v) { return this; } public $CLASS setDelayInit(boolean v) { return this; }
}''')
    for file in ['packages/react-native-mobile/android/src/main/java/com/ft/sdk/reactnative/FTLogImpl.java', 'packages/react-native-session-replay/android/src/main/java/com/ft/sdk/reactnative/sessionreplay/FTSessionReplayImpl.java']:
        source = ROOT / file
        (tmp / source.name).write_text(source.read_text())
    write('test.ConfigTests', '''import com.ft.sdk.FTSdk;
import com.ft.sdk.reactnative.FTLogImpl;
import com.ft.sdk.reactnative.sessionreplay.FTSessionReplayImpl;
import com.facebook.react.bridge.*;
import java.util.HashMap;
public class $CLASS {
static int resolved, failures;
static void check(double actual, double expected) { if (Math.abs(actual - expected) > 0.00001) { System.err.println("Expected " + expected + ", got " + actual); failures++; } }
public static void main(String[] args) {
FTLogImpl log = new FTLogImpl(); FTSessionReplayImpl replay = new FTSessionReplayImpl();
Promise promise = v -> resolved++;
double[] rates = {0, 0.001, 0.125, 1}; double[] percentages = {0, 0.1, 12.5, 100};
for (int i = 0; i < rates.length; i++) {
HashMap<String,Object> map = new HashMap<>(); map.put("sampleRate", rates[i]); map.put("enableWebViewLog", true); map.put("sessionReplayOnErrorSampleRate", rates[i]);
log.logConfig(() -> map, promise); check(FTSdk.log.percentage, percentages[i]); check(FTSdk.log.webView ? 1 : 0, 1);
replay.sessionReplayConfig(() -> map, promise, new ReactContext()); check(FTSdk.replay.percentage, percentages[i]); check(FTSdk.replay.errorPercentage, percentages[i]);
}
HashMap<String,Object> map = new HashMap<>(); map.put("enableWebViewLog", false);
log.logConfig(() -> map, promise); check(FTSdk.log.webView ? 1 : 0, 0); check(FTSdk.log.percentage, 100);
map.clear(); log.logConfig(() -> map, promise); check(FTSdk.log.webView ? 1 : 0, 0);
replay.sessionReplayConfig(() -> map, promise, new ReactContext()); check(FTSdk.replay.percentage, 100); check(FTSdk.replay.errorPercentage, 0);
map.put("sampleRate", 0.125); replay.sessionReplayConfig(() -> map, promise, new ReactContext()); check(FTSdk.replay.percentage, 12.5); check(FTSdk.replay.errorPercentage, 0);
map.clear(); map.put("sessionReplayOnErrorSampleRate", 0.001); replay.sessionReplayConfig(() -> map, promise, new ReactContext()); check(FTSdk.replay.percentage, 100); check(FTSdk.replay.errorPercentage, 0.1); check(resolved, 13);
for (double percentage : new double[]{0, 0.1, 12.5, 100}) {
map.clear(); map.put("sampleRate", 1.0); map.put("logSamplingRate", percentage);
map.put("sessionReplayOnErrorSampleRate", 1.0); map.put("sessionReplaySamplingRate", percentage); map.put("sessionReplayOnErrorSamplingRate", percentage);
log.logConfig(() -> map, promise); check(FTSdk.log.percentage, percentage);
replay.sessionReplayConfig(() -> map, promise, new ReactContext()); check(FTSdk.replay.percentage, percentage); check(FTSdk.replay.errorPercentage, percentage);
}
check(resolved, 21);
if (failures > 0) throw new AssertionError(failures + " config checks failed");
System.out.println("Android config bridge (Java 8): percentages; WebView true/false/omitted; defaults PASS");
} }''')
    subprocess.run(['javac', '--release', '8', '-d', str(tmp / 'classes')] + [str(f) for f in tmp.rglob('*.java')], check=True)
    subprocess.run(['java', '-cp', str(tmp / 'classes'), 'test.ConfigTests'], check=True)


if __name__ == '__main__':
    # Run both platforms even when one fails, so the regression evidence is complete.
    failed = False
    with tempfile.TemporaryDirectory(prefix='ft-config-bridge-') as directory:
        for name, run in [('ios', run_ios), ('android', run_android)]:
            tmp = Path(directory) / name
            tmp.mkdir()
            try:
                run(tmp)
            except subprocess.CalledProcessError:
                failed = True
    raise SystemExit(1 if failed else 0)
