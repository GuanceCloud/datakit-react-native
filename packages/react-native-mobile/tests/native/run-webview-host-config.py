#!/usr/bin/env python3
"""Execute RN WebView host/log mappings and target native SDK policies."""
import argparse
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[4]
MOBILE = ROOT / 'packages/react-native-mobile'


def block(source, signature, optional=False):
    start = source.find(signature)
    if start < 0:
        if optional:
            return ''
        raise ValueError('Missing production method: ' + signature)
    brace = source.index('{', start)
    end, depth = brace + 1, 1
    while depth:
        depth += (source[end] == '{') - (source[end] == '}')
        end += 1
    return source[start:end]


def run_ios(tmp, sources):
    mobile_source = (MOBILE / 'ios/FTMobileReactNative.mm').read_text()
    sdk_bridge = block(mobile_source, '- (void)sdkConfig:')
    sdk_mapping = block(sdk_bridge, 'if ([context.allKeys containsObject:@"allowWebViewHost"])', True)
    rum_bridge = block((MOBILE / 'ios/FTReactNativeRUM.mm').read_text(), '- (void)setConfig:')
    rum_mapping = block(rum_bridge, 'if ([context.allKeys containsObject:@"allowWebViewHost"])')
    setter = block((sources / 'Agent/Config/FTSDKConfig.m').read_text(), '- (void)setAllowWebViewHost:')
    policy = block((sources / 'Agent/Core/FTSDKAgent.m').read_text(), '- (NSArray *)effectiveAllowWebViewHost')
    log_override = block(mobile_source, 'if ([override.allKeys containsObject:@"logEnableWebViewLog"]', True)
    log_merge = block((sources / 'Agent/Core/FTConfig+RemoteConfig.m').read_text(),
                      'if (model.logEnableWebViewLog != nil)')
    source = r'''
#import <Foundation/Foundation.h>
#include <assert.h>
@interface FTSDKConfig : NSObject
@property (nonatomic, copy) NSArray *allowWebViewHost;
@property BOOL allowWebViewHostConfigured;
@property NSArray *remoteAllowWebViewHost;
@end
@implementation FTSDKConfig
''' + setter + r'''
@end
@interface FTRumConfig : NSObject
@property NSArray *allowWebViewHost;
@end
@implementation FTRumConfig @end
@interface RCTConvert : NSObject
+ (NSArray *)NSArray:(id)value;
+ (BOOL)BOOL:(id)value;
@end
@implementation RCTConvert
+ (NSArray *)NSArray:(id)value { return value == NSNull.null ? nil : value; }
+ (BOOL)BOOL:(id)value { return [value boolValue]; }
@end
@interface FTRemoteConfigModel : NSObject
@property NSNumber *logEnableWebViewLog;
@end
@implementation FTRemoteConfigModel @end
@interface FTLoggerConfig : NSObject
@property BOOL enableWebViewLog;
- (void)merge:(FTRemoteConfigModel *)model;
@end
@implementation FTLoggerConfig
- (void)merge:(FTRemoteConfigModel *)model {
''' + log_merge + r'''
}
@end
static void overrideLog(NSDictionary *override, FTRemoteConfigModel *model) {
''' + log_override + r'''
}
@interface FTSDKAgent : NSObject
@property FTSDKConfig *sdkConfig;
@property FTRumConfig *rumConfig;
@end
@implementation FTSDKAgent
''' + policy + r'''
@end
static void configureSDK(NSDictionary *context, FTSDKConfig *config) {
''' + sdk_mapping + r'''
}
static void configureRUM(NSDictionary *context, FTRumConfig *rumConfig) {
''' + rum_mapping + r'''
}
static void expectHosts(NSArray *actual, NSArray *expected) {
  assert((actual == nil && expected == nil) || [actual isEqualToArray:expected]);
}
int main() { @autoreleasepool {
  NSArray *legacy = @[@"legacy.example.com"];
  for (id input in @[NSNull.null, @[], @[@"base.example.com"]]) {
    FTSDKAgent *agent = [FTSDKAgent new];
    agent.sdkConfig = [FTSDKConfig new];
    configureSDK(@{@"allowWebViewHost": input}, agent.sdkConfig);
    assert(agent.sdkConfig.allowWebViewHostConfigured);
    NSArray *expected = input == NSNull.null ? nil : input;
    expectHosts([agent effectiveAllowWebViewHost], expected); // Also works without RUM.
    agent.rumConfig = [FTRumConfig new];
    configureRUM(@{@"allowWebViewHost": legacy}, agent.rumConfig);
    expectHosts([agent effectiveAllowWebViewHost], expected);
    agent.sdkConfig.remoteAllowWebViewHost = @[@"remote.example.com"];
    expectHosts([agent effectiveAllowWebViewHost], @[@"remote.example.com"]);
    agent.sdkConfig.remoteAllowWebViewHost = @[];
    expectHosts([agent effectiveAllowWebViewHost], @[]);
    agent.sdkConfig.remoteAllowWebViewHost = nil;
    expectHosts([agent effectiveAllowWebViewHost], expected);
  }
  FTSDKAgent *agent = [FTSDKAgent new];
  agent.sdkConfig = [FTSDKConfig new];
  configureSDK(@{}, agent.sdkConfig);
  assert(!agent.sdkConfig.allowWebViewHostConfigured);
  expectHosts([agent effectiveAllowWebViewHost], nil);
  agent.rumConfig = [FTRumConfig new];
  configureRUM(@{@"allowWebViewHost": legacy}, agent.rumConfig);
  expectHosts([agent effectiveAllowWebViewHost], legacy);
  configureRUM(@{@"allowWebViewHost": @[]}, agent.rumConfig);
  expectHosts([agent effectiveAllowWebViewHost], @[]);
  puts("iOS host mapping + native policy: omitted/null/empty/list, legacy fallback, remote priority PASS");
  for (NSNumber *value in @[@YES, @NO]) {
    FTRemoteConfigModel *model = [FTRemoteConfigModel new];
    model.logEnableWebViewLog = @(!value.boolValue);
    overrideLog(@{@"logEnableWebViewLog": value}, model);
    assert([model.logEnableWebViewLog isEqualToNumber:value]);
    FTLoggerConfig *logger = [FTLoggerConfig new];
    logger.enableWebViewLog = !value.boolValue;
    [logger merge:model];
    assert(logger.enableWebViewLog == value.boolValue);
    overrideLog(@{}, model);
    assert([model.logEnableWebViewLog isEqualToNumber:value]);
    overrideLog(@{@"logEnableWebViewLog": NSNull.null}, model);
    assert([model.logEnableWebViewLog isEqualToNumber:value]);
    model.logEnableWebViewLog = nil;
    [logger merge:model];
    assert(logger.enableWebViewLog == value.boolValue);
  }
  puts("iOS logEnableWebViewLog override + native merge: true/false/omitted/null PASS");
} }
'''
    file = tmp / 'hosts.mm'
    file.write_text(source)
    subprocess.run(['xcrun', 'clang++', '-fobjc-arc', '-fblocks', '-framework', 'Foundation',
                    str(file), '-o', str(tmp / 'hosts')], check=True)
    subprocess.run([str(tmp / 'hosts')], check=True)


def run_android(tmp, repo):
    def native(path):
        return subprocess.check_output(['git', '-C', str(repo), 'show',
                                       'agent_1.7.6:ft-sdk/src/main/java/com/ft/sdk/' + path], text=True)

    base = native('FTSDKConfig.java')
    rum = native('FTRUMConfig.java')
    policy = block(native('FTWebViewHandler.java'), 'static String[] resolveAllowedWebViewHosts(')
    mobile_source = (MOBILE / 'android/src/main/java/com/ft/sdk/reactnative/FTMobileImpl.java').read_text()
    sdk_bridge = block(mobile_source, 'public void sdkConfig(')
    sdk_mapping = block(sdk_bridge, 'if (map.containsKey("allowWebViewHost"))', True)
    rum_bridge = block((MOBILE / 'android/src/main/java/com/ft/sdk/reactnative/FTRUMImpl.java').read_text(),
                       'public void setConfig(')
    rum_mapping = block(rum_bridge, 'if (allowWebViewHost != null)')
    log_override = block(mobile_source, 'if (override.hasKey("logEnableWebViewLog")', True)
    log_merge = block(native('FTRemoteConfigManager.java'),
                      'if (mRemoteConfig.getLogEnableWebViewLog() != null)')
    bean = native('garble/bean/RemoteConfigBean.java')
    logger = native('FTLoggerConfig.java')
    (tmp / 'RemoteConfigBean.java').write_text('''package com.ft.sdk;
public class RemoteConfigBean {
  private Boolean logEnableWebViewLog;
''' + block(bean, 'public Boolean getLogEnableWebViewLog(') + '\n' +
        block(bean, 'public void setLogEnableWebViewLog(') + '\n}\n')
    (tmp / 'FTLoggerConfig.java').write_text('''package com.ft.sdk;
public class FTLoggerConfig {
  private boolean enableWebViewLog;
''' + block(logger, 'public boolean isEnableWebViewLog(') + '\n' +
        block(logger, 'public FTLoggerConfig setEnableWebViewLog(') + '\n}\n')
    (tmp / 'FTSDKConfig.java').write_text('''package com.ft.sdk;
public class FTSDKConfig {
  private String[] allowWebViewHost, remoteAllowWebViewHost;
  private boolean allowWebViewHostConfigured;
''' + '\n'.join(block(base, signature) for signature in [
        'public FTSDKConfig setAllowWebViewHost(', 'public String[] getAllowWebViewHost(',
        'boolean isAllowWebViewHostConfigured(', 'String[] getRemoteAllowWebViewHost(',
        'void setRemoteAllowWebViewHost(']) + '\n}\n')
    (tmp / 'FTRUMConfig.java').write_text('''package com.ft.sdk;
public class FTRUMConfig {
  private String[] allowWebViewHost;
''' + block(rum, 'public FTRUMConfig setAllowWebViewHost(') + '\n' +
        block(rum, 'public String[] getAllowWebViewHost(') + '\n}\n')
    (tmp / 'HostPolicy.java').write_text('package com.ft.sdk;\nclass HostPolicy {\n' + policy +
        '\nstatic void mergeLog(RemoteConfigBean mRemoteConfig, FTLoggerConfig config) {\n' + log_merge + '\n}\n}\n')
    # Recording SDK boundary for the legacy bridge's original direct base write.
    (tmp / 'FTSdk.java').write_text('''package com.ft.sdk;
public class FTSdk {
  public static FTSDKConfig base;
  public static FTSdk get() { return new FTSdk(); }
  public FTSDKConfig getBaseConfig() { return base; }
}''')
    (tmp / 'Bridge.java').write_text('''package com.ft.sdk.reactnative;
import com.ft.sdk.*;
import java.util.*;
public class Bridge {
  static class ReadableMap {
    private final Map<String,Object> values;
    ReadableMap(Map<String,Object> values) { this.values = values; }
    boolean hasKey(String key) { return values.containsKey(key); }
    boolean isNull(String key) { return values.get(key) == null; }
    boolean getBoolean(String key) { return (Boolean) values.get(key); }
  }
  public static void logOverride(Map<String,Object> values, RemoteConfigBean configBean) {
    ReadableMap override = new ReadableMap(values);
''' + log_override + '''
  }
  public static void sdk(Map<String,Object> map, FTSDKConfig sdkConfig) {
''' + sdk_mapping + '''
  }
  public static void rum(Map<String,Object> map, FTRUMConfig rumConfig) {
    ArrayList<String> allowWebViewHost = (ArrayList<String>) map.get("allowWebViewHost");
''' + rum_mapping + '\n  }\n}\n')
    (tmp / 'Tests.java').write_text('''package com.ft.sdk;
import com.ft.sdk.reactnative.Bridge;
import java.util.*;
public class Tests {
  static void check(boolean ok) { if (!ok) throw new AssertionError(); }
  static Map<String,Object> config(Object value) {
    Map<String,Object> map = new HashMap<>(); map.put("allowWebViewHost", value); return map;
  }
  static void expectHosts(String[] actual, String[] expected) { check(Arrays.equals(actual, expected)); }
  public static void main(String[] args) {
    ArrayList<String> legacy = new ArrayList<>(Arrays.asList("legacy.example.com"));
    for (ArrayList<String> value : Arrays.asList(null, new ArrayList<String>(),
        new ArrayList<>(Arrays.asList("base.example.com")))) {
      FTSDKConfig base = new FTSDKConfig(); FTSdk.base = base;
      Bridge.sdk(config(value), base);
      check(base.isAllowWebViewHostConfigured());
      String[] expected = value == null ? null : value.toArray(new String[0]);
      expectHosts(HostPolicy.resolveAllowedWebViewHosts(base, null), expected);
      FTRUMConfig rum = new FTRUMConfig(); Bridge.rum(config(legacy), rum);
      expectHosts(HostPolicy.resolveAllowedWebViewHosts(base, rum), expected);
      base.setRemoteAllowWebViewHost(new String[]{"remote.example.com"});
      expectHosts(HostPolicy.resolveAllowedWebViewHosts(base, rum), new String[]{"remote.example.com"});
      base.setRemoteAllowWebViewHost(new String[0]);
      expectHosts(HostPolicy.resolveAllowedWebViewHosts(base, rum), new String[0]);
      base.setRemoteAllowWebViewHost(null);
      expectHosts(HostPolicy.resolveAllowedWebViewHosts(base, rum), expected);
    }
    FTSDKConfig base = new FTSDKConfig(); FTSdk.base = base;
    Bridge.sdk(new HashMap<String,Object>(), base);
    check(!base.isAllowWebViewHostConfigured());
    expectHosts(HostPolicy.resolveAllowedWebViewHosts(base, null), null);
    FTRUMConfig rum = new FTRUMConfig(); Bridge.rum(config(legacy), rum);
    check(!base.isAllowWebViewHostConfigured());
    expectHosts(HostPolicy.resolveAllowedWebViewHosts(base, rum), new String[]{"legacy.example.com"});
    Bridge.rum(config(new ArrayList<String>()), rum);
    expectHosts(HostPolicy.resolveAllowedWebViewHosts(base, rum), new String[0]);
    System.out.println("Android host mapping + native policy (Java 8): omitted/null/empty/list, legacy fallback, remote priority PASS");
    for (boolean value : new boolean[]{true, false}) {
      RemoteConfigBean bean = new RemoteConfigBean(); bean.setLogEnableWebViewLog(!value);
      Map<String,Object> override = new HashMap<>(); override.put("logEnableWebViewLog", value);
      Bridge.logOverride(override, bean);
      check(Boolean.valueOf(value).equals(bean.getLogEnableWebViewLog()));
      FTLoggerConfig logger = new FTLoggerConfig().setEnableWebViewLog(!value);
      HostPolicy.mergeLog(bean, logger);
      check(logger.isEnableWebViewLog() == value);
      Bridge.logOverride(new HashMap<String,Object>(), bean);
      check(Boolean.valueOf(value).equals(bean.getLogEnableWebViewLog()));
      override.put("logEnableWebViewLog", null);
      Bridge.logOverride(override, bean);
      check(Boolean.valueOf(value).equals(bean.getLogEnableWebViewLog()));
      bean.setLogEnableWebViewLog(null); HostPolicy.mergeLog(bean, logger);
      check(logger.isEnableWebViewLog() == value);
    }
    System.out.println("Android logEnableWebViewLog override + native merge: true/false/omitted/null PASS");
  }
}''')
    subprocess.run(['javac', '--release', '8', '-d', str(tmp / 'classes')] +
                   [str(file) for file in tmp.glob('*.java')], check=True)
    subprocess.run(['java', '-cp', str(tmp / 'classes'), 'com.ft.sdk.Tests'], check=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--android-sdk-repo', type=Path, required=True,
                        help='Android SDK checkout containing agent_1.7.6')
    parser.add_argument('--ios-sdk-sources', type=Path,
                        default=ROOT / 'example/ios/Pods/GuanceSDK/Sources')
    args = parser.parse_args()
    failed = False
    with tempfile.TemporaryDirectory(prefix='rn-webview-hosts-') as directory:
        for name, callback, sdk in [('ios', run_ios, args.ios_sdk_sources),
                                    ('android', run_android, args.android_sdk_repo)]:
            tmp = Path(directory) / name
            tmp.mkdir()
            try:
                callback(tmp, sdk)
            except subprocess.CalledProcessError:
                failed = True
    raise SystemExit(1 if failed else 0)
