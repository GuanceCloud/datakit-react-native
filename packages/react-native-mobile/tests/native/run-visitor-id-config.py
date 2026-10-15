#!/usr/bin/env python3
"""Run RN config mapping against real target native configuration implementations."""
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[4]
CACHE = Path('/private/tmp/native-adapter-cache')

def native(platform, path):
    repo = CACHE / ('ssh_git_gitlab.jiagouyun.com_40022_cma_ft-sdk-' + platform + '.git')
    tag = '1.6.8-alpha.10' if platform == 'ios' else 'agent_1.7.6-alpha06'
    return subprocess.check_output(['git', '--git-dir=' + str(repo), 'show', tag + ':' + path], text=True)

def ios(tmp):
    for name, path in [
        ('FTVisitorIDConfig.h', 'Sources/Agent/Shared/Public/FTVisitorIDConfig.h'),
        ('FTVisitorIDConfig+Private.h', 'Sources/Agent/Config/FTVisitorIDConfig+Private.h'),
        ('FTVisitorIDConfig.m', 'Sources/Agent/Config/FTVisitorIDConfig.m'),
    ]:
        (tmp / name).write_text(native('ios', path))
    (tmp / 'FTInnerLog.h').write_text('#define FTInnerLogWarning(...)\n')
    production = (ROOT / 'packages/react-native-mobile/ios/FTReactNativeRUM.mm').read_text()
    mapper = production[production.index('static FTVisitorIDConfig *FTVisitorIdConfigFromDictionary'):production.index('@interface FTReactNativeRUM')]
    tests = r'''
#import "FTVisitorIDConfig+Private.h"
#include <math.h>
#include <assert.h>
''' + mapper + r'''
int main() { @autoreleasepool {
  NSError *error = nil;
  assert(FTVisitorIdConfigFromDictionary(nil, &error) == nil && error == nil);
  assert(FTVisitorIdConfigFromDictionary(NSNull.null, &error) == nil && error == nil);
  FTVisitorIDConfig *config = FTVisitorIdConfigFromDictionary(@{@"header": @"x-visitor-id", @"ttlHours": @0.5,
    @"urlPrefixes": @[@"https://api.example.com/v1/"], @"regularExpressions": @[@"^https://other\\.example\\.com/orders/"]}, &error);
  assert(config != nil && error == nil && config.ttlHours == 0.5);
  assert([config.header isEqualToString:@"x-visitor-id"]);
  assert([config matchesURL:[NSURL URLWithString:@"https://api.example.com/v1/item"]]);
  assert([config matchesURL:[NSURL URLWithString:@"https://other.example.com/orders/1"]]);
  for (NSString *url in @[@"https://api.example.com.evil/v1/item", @"http://api.example.com/v1/item", @"https://api.example.com:444/v1/item", @"wss://api.example.com/v1/item"]) {
    assert(![config matchesURL:[NSURL URLWithString:url]]);
  }
  config = FTVisitorIdConfigFromDictionary(@{@"header": @"x-visitor-id", @"urlPrefixes": @[@"https://api.example.com/"]}, &error);
  assert(config.ttlHours == 24);
  for (id value in @[@[], @{@"header": @"x-visitor-id"}, @{@"header": @"x-visitor-id", @"regularExpressions": @[@"["]},
      @{@"header": @"x-visitor-id", @"ttlHours": @0, @"urlPrefixes": @[@"https://api.example.com/"]}]) {
    error = nil; assert(FTVisitorIdConfigFromDictionary(value, &error) == nil && error != nil);
  }
  puts("iOS Visitor ID mapper + native matching: PASS");
} }
'''
    (tmp / 'main.mm').write_text(tests)
    subprocess.run(['clang++', '-fobjc-arc', '-framework', 'Foundation', '-I', str(tmp), str(tmp / 'main.mm'), str(tmp / 'FTVisitorIDConfig.m'), '-o', str(tmp / 'test')], check=True)
    subprocess.run([str(tmp / 'test')], check=True)

def android(tmp):
    (tmp / 'FTVisitorIdConfig.java').write_text(native('android', 'ft-sdk/src/main/java/com/ft/sdk/FTVisitorIdConfig.java'))
    (tmp / 'VisitorIdConfigMapper.java').write_text((ROOT / 'packages/react-native-mobile/android/src/main/java/com/ft/sdk/reactnative/VisitorIdConfigMapper.java').read_text())
    (tmp / 'LogUtils.java').write_text('package com.ft.sdk.garble.utils; public class LogUtils { public static void w(String a, String b) {} }')
    (tmp / 'Test.java').write_text(r'''
package com.ft.sdk.reactnative;
import com.ft.sdk.FTVisitorIdConfig;
import java.util.*;
import java.lang.reflect.Method;
public class Test {
  static Object call(FTVisitorIdConfig config, String name, Class<?>[] types, Object... args) throws Exception {
    Method method = FTVisitorIdConfig.class.getDeclaredMethod(name, types); method.setAccessible(true); return method.invoke(config, args);
  }
  static void check(boolean value) { if (!value) throw new AssertionError(); }
  public static void main(String[] args) throws Exception {
    check(VisitorIdConfigMapper.fromMap(null) == null);
    Map<String,Object> map = new HashMap<>(); map.put("header", "x-visitor-id"); map.put("ttlHours", 0.5);
    map.put("urlPrefixes", Arrays.asList("https://api.example.com/v1/")); map.put("regularExpressions", Arrays.asList("^https://other\\.example\\.com/orders/"));
    FTVisitorIdConfig config = VisitorIdConfigMapper.fromMap(map);
    call(config, "validatedCopy", new Class<?>[]{});
    check(((Long) call(config, "getTtlMillis", new Class<?>[]{})) == 1800000L);
    check("x-visitor-id".equals(call(config, "getHeader", new Class<?>[]{})));
    for (String url : new String[]{"https://api.example.com/v1/item", "https://other.example.com/orders/1"}) check((Boolean) call(config, "matches", new Class<?>[]{String.class}, url));
    for (String url : new String[]{"https://api.example.com.evil/v1/item", "http://api.example.com/v1/item", "https://api.example.com:444/v1/item", "wss://api.example.com/v1/item"}) check(!(Boolean) call(config, "matches", new Class<?>[]{String.class}, url));
    map.remove("ttlHours"); config = VisitorIdConfigMapper.fromMap(map); check(((Long) call(config, "getTtlMillis", new Class<?>[]{})) == 86400000L);
    map.put("regularExpressions", Arrays.asList("["));
    try { VisitorIdConfigMapper.fromMap(map); throw new AssertionError(); } catch (IllegalArgumentException expected) {}
    map.remove("regularExpressions"); map.remove("urlPrefixes");
    try { VisitorIdConfigMapper.fromMap(map); throw new AssertionError(); } catch (IllegalArgumentException expected) {}
    System.out.println("Android Visitor ID mapper + native matching (Java 8): PASS");
  }
}
''')
    subprocess.run(['javac', '--release', '8', '-d', str(tmp / 'classes')] + [str(f) for f in tmp.glob('*.java')], check=True)
    subprocess.run(['java', '-cp', str(tmp / 'classes'), 'com.ft.sdk.reactnative.Test'], check=True)

if __name__ == '__main__':
    with tempfile.TemporaryDirectory(prefix='rn-visitor-id-') as root:
        for name, run in [('ios', ios), ('android', android)]:
            directory = Path(root) / name
            directory.mkdir()
            run(directory)
