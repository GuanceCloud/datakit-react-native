#!/usr/bin/env python3
"""Run production bridge time conversion on Foundation and Java 8 (no device)."""
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[4]
SDK = ROOT / 'packages/react-native-mobile'


def run(args):
    subprocess.run([str(arg) for arg in args], check=True)


def method(source, signature):
    start = source.index(signature)
    opening = source.index('{', start)
    depth = 1
    end = opening + 1
    while depth:
        depth += (source[end] == '{') - (source[end] == '}')
        end += 1
    return source[start:end]


with tempfile.TemporaryDirectory(prefix='ft-view-timing-') as directory:
    tmp = Path(directory)
    objc = tmp / 'ViewTimingTests.m'
    objc.write_text('''#import "FTReactNativeViewTiming.h"
#include <assert.h>
int main(void) { @autoreleasepool {
  assert(FTViewEpochNanoseconds(1700000000001).longLongValue == 1700000000001000000LL);
  assert(FTViewEpochNanoseconds(1700000000000.125).longLongValue == 1700000000000125000LL);
  assert(FTViewEpochNanoseconds(9223372036854).longLongValue == 9223372036854000000LL);
  double invalid[] = {0, -1, NAN, INFINITY, 9223372036855.0, 0x1p63};
  for (unsigned i=0; i<sizeof(invalid)/sizeof(double); i++) assert(FTViewEpochNanoseconds(invalid[i]) == nil);
  assert(FTViewDurationNanoseconds(25500000).longLongValue == 25500000);
  assert(FTViewDurationNanoseconds(123.75).longLongValue == 123);
  assert(FTViewDurationNanoseconds(NAN).longLongValue == 0);
  assert(FTViewDurationNanoseconds(-1).longLongValue == 0);
  assert(FTViewDurationNanoseconds(0x1p63).longLongValue == 0);
} return 0; }
''')
    run(['xcrun', 'clang', '-fobjc-arc', '-framework', 'Foundation', '-I', SDK / 'ios', objc, '-o', tmp / 'ios-test'])
    run([tmp / 'ios-test'])
    print('PASS: iOS integer nanosecond conversion', flush=True)
    java = tmp / 'ViewTimingTests.java'
    java.write_text('''package com.ft.sdk.reactnative;
public class ViewTimingTests {
  private static void equal(long actual, long expected) {
    if (actual != expected) throw new AssertionError(actual + " != " + expected);
  }
  public static void main(String[] args) {
    equal(ViewTiming.epochNanoseconds(1700000000001.0), 1700000000001000000L);
    equal(ViewTiming.epochNanoseconds(1700000000000.125), 1700000000000125000L);
    equal(ViewTiming.epochNanoseconds(9223372036854.0), 9223372036854000000L);
    for (double invalid: new double[]{0, -1, Double.NaN, Double.POSITIVE_INFINITY, 9223372036855.0, 0x1p63}) equal(ViewTiming.epochNanoseconds(invalid), 0);
    equal(ViewTiming.durationNanoseconds(25500000), 25500000);
    equal(ViewTiming.durationNanoseconds(123.75), 123);
    equal(ViewTiming.durationNanoseconds(Double.NaN), 0);
    equal(ViewTiming.durationNanoseconds(-1), 0);
    equal(ViewTiming.durationNanoseconds(0x1p63), 0);
  }
}
''')
    run(['javac', '--release', '8', '-d', tmp, SDK / 'android/src/main/java/com/ft/sdk/reactnative/ViewTiming.java', java])
    run(['java', '-cp', tmp, 'com.ft.sdk.reactnative.ViewTimingTests'])
    print('PASS: Android Java 8 integer nanosecond conversion', flush=True)

    # Compile the actual production entry points with recording SDK doubles;
    # this verifies argument units and selectors rather than reimplementing mapping.
    ios = (SDK / 'ios/FTReactNativeRUM.mm').read_text()
    methods = '\n'.join(method(ios, signature) for signature in [
        '- (void)onCreateViewWithLoadStart:', '- (void)startViewWithTrackingType:',
        '- (void)onCreateView:', '- (void)startView:', '- (void)updateViewLoadingTime:'])
    objc.write_text(r'''#import "FTReactNativeViewTiming.h"
#include <assert.h>
typedef NSInteger FTRUMViewTrackingType;
typedef void (^RCTPromiseResolveBlock)(id);
typedef void (^RCTPromiseRejectBlock)(NSString *, NSString *, NSError *);
static NSString *lastName; static NSNumber *lastDuration, *lastEpoch;
static NSDictionary *lastProperty; static NSInteger lastType;
static int updateCount; static int64_t updatedDuration;
@interface FTExternalDataManager : NSObject
+ (instancetype)sharedManager;
- (void)onCreateView:(NSString *)name loadTime:(NSNumber *)duration loadStartEpochNs:(NSNumber *)epoch;
- (void)onCreateView:(NSString *)name loadTime:(NSNumber *)duration;
- (void)startViewWithName:(NSString *)name property:(NSDictionary *)property trackingType:(NSInteger)type;
- (void)startViewWithName:(NSString *)name property:(NSDictionary *)property;
- (void)updateViewLoadingTime:(NSNumber *)duration;
@end
@implementation FTExternalDataManager
+ (instancetype)sharedManager { static id manager; if (!manager) manager = [self new]; return manager; }
- (void)onCreateView:(NSString *)name loadTime:(NSNumber *)duration loadStartEpochNs:(NSNumber *)epoch { lastName=name; lastDuration=duration; lastEpoch=epoch; }
- (void)onCreateView:(NSString *)name loadTime:(NSNumber *)duration { lastName=name; lastDuration=duration; lastEpoch=nil; }
- (void)startViewWithName:(NSString *)name property:(NSDictionary *)property trackingType:(NSInteger)type { lastName=name; lastProperty=property; lastType=type; }
- (void)startViewWithName:(NSString *)name property:(NSDictionary *)property { lastName=name; lastProperty=property; lastType=0; }
- (void)updateViewLoadingTime:(NSNumber *)duration { updateCount++; updatedDuration=duration.longLongValue; }
@end
@interface Bridge : NSObject @end
@implementation Bridge
''' + methods + r'''
@end
int main(void) { @autoreleasepool {
  Bridge *bridge = [Bridge new]; __block int rejected=0;
  RCTPromiseResolveBlock resolve=^(id value){};
  RCTPromiseRejectBlock reject=^(NSString *code, NSString *message, NSError *error){ rejected++; };
  [bridge onCreateViewWithLoadStart:@"Home" loadTime:25500000 loadStartEpochMs:1700000000001 resolve:resolve reject:reject];
  assert([lastName isEqual:@"Home"] && lastDuration.longLongValue == 25500000 && lastEpoch.longLongValue == 1700000000001000000LL);
  [bridge onCreateViewWithLoadStart:@"Home" loadTime:0 loadStartEpochMs:1700000000001 resolve:resolve reject:reject];
  assert(lastEpoch == nil);
  [bridge onCreateViewWithLoadStart:@"Home" loadTime:25500000 loadStartEpochMs:NAN resolve:resolve reject:reject];
  assert(lastEpoch == nil && lastDuration.longLongValue == 25500000);
  [bridge startViewWithTrackingType:@"Home" property:@{@"page":@1} trackingType:1 resolve:resolve reject:reject];
  assert(lastType == 1 && [lastProperty[@"page"] isEqual:@1]);
  [bridge startViewWithTrackingType:@"Home" property:nil trackingType:2 resolve:resolve reject:reject];
  assert(rejected == 1 && lastType == 1);
  [bridge startView:@"Manual" property:nil resolve:resolve reject:reject];
  assert(lastType == 0 && [lastName isEqual:@"Manual"]);
  [bridge onCreateView:@"Manual" loadTime:1000000 resolve:resolve reject:reject];
  assert(lastDuration.longLongValue == 1000000 && lastEpoch == nil);
  [bridge updateViewLoadingTime:25500000 resolve:resolve reject:reject];
  assert(updatedDuration == 25500000 && updateCount == 1);
  [bridge updateViewLoadingTime:0 resolve:resolve reject:reject];
  assert(updatedDuration == 0 && updateCount == 2);
  [bridge updateViewLoadingTime:9007199254740991.0 resolve:resolve reject:reject];
  assert(updatedDuration == 9007199254740991LL && updateCount == 3);
  double invalidUpdates[] = {-1, NAN, INFINITY, -INFINITY, 1.5, 9007199254740992.0, 0x1p63};
  for (unsigned i=0; i<sizeof(invalidUpdates)/sizeof(double); i++) {
    int before=rejected;
    [bridge updateViewLoadingTime:invalidUpdates[i] resolve:resolve reject:reject];
    assert(rejected == before + 1 && updateCount == 3 && updatedDuration == 9007199254740991LL);
  }
  // Updating is not another onCreateView/startView and does not alter their arguments.
  assert(lastDuration.longLongValue == 1000000 && [lastName isEqual:@"Manual"]);
} return 0; }
''')
    run(['xcrun', 'clang', '-fobjc-arc', '-fblocks', '-framework', 'Foundation', '-I', SDK / 'ios', objc, '-o', tmp / 'ios-bridge-test'])
    run([tmp / 'ios-bridge-test'])
    print('PASS: production iOS View bridge mapping and Manual compatibility', flush=True)
    android = (SDK / 'android/src/main/java/com/ft/sdk/reactnative/FTRUMImpl.java').read_text()
    methods = '\n'.join(method(android, '  public void ' + name + '(') for name in [
        'onCreateViewWithLoadStart', 'startViewWithTrackingType', 'onCreateView', 'startView', 'updateViewLoadingTime'])
    java.write_text(r'''package com.ft.sdk.reactnative;
import java.util.HashMap;
public class ViewTimingTests {
  enum ViewTrackingType { MANUAL, AUTOMATIC }
  static class Promise { int rejected; void resolve(Object value) {} void reject(String code, String message) { rejected++; } }
  static class ReadableMap { HashMap<String, Object> toHashMap() { HashMap<String,Object> m=new HashMap<>(); m.put("page",1); return m; } }
  static class FTRUMGlobalManager {
    static final FTRUMGlobalManager INSTANCE=new FTRUMGlobalManager();
    static FTRUMGlobalManager get() { return INSTANCE; }
    String name; long duration, epoch; ViewTrackingType type; HashMap<String,Object> property;
    long updatedDuration; int updateCount;
    void updateLoadTime(long d) { updatedDuration=d; updateCount++; }
    void onCreateView(String n, long d, long e) { name=n; duration=d; epoch=e; }
    void onCreateView(String n, long d) { onCreateView(n,d,0); }
    void startView(String n, HashMap<String,Object> p, ViewTrackingType t) { name=n; property=p; type=t; }
    void startView(String n, HashMap<String,Object> p) { startView(n,p,ViewTrackingType.MANUAL); }
    void startView(String n) { startView(n,null); }
  }
''' + methods + r'''
  static void check(boolean ok) { if (!ok) throw new AssertionError(); }
  public static void main(String[] args) {
    ViewTimingTests bridge=new ViewTimingTests(); Promise p=new Promise(); FTRUMGlobalManager sdk=FTRUMGlobalManager.get();
    bridge.onCreateViewWithLoadStart("Home",25500000,1700000000001.0,p);
    check(sdk.name.equals("Home") && sdk.duration == 25500000 && sdk.epoch == 1700000000001000000L);
    bridge.onCreateViewWithLoadStart("Home",0,1700000000001.0,p); check(sdk.epoch == 0);
    bridge.onCreateViewWithLoadStart("Home",25500000,Double.NaN,p); check(sdk.epoch == 0 && sdk.duration == 25500000);
    bridge.startViewWithTrackingType("Home",new ReadableMap(),1,p);
    check(sdk.type == ViewTrackingType.AUTOMATIC && sdk.property.get("page").equals(1));
    bridge.startViewWithTrackingType("Home",null,2,p); check(p.rejected == 1 && sdk.type == ViewTrackingType.AUTOMATIC);
    bridge.startView("Manual",null,p); check(sdk.type == ViewTrackingType.MANUAL && sdk.name.equals("Manual"));
    bridge.onCreateView("Manual",1000000.0,p); check(sdk.duration == 1000000 && sdk.epoch == 0);
    bridge.updateViewLoadingTime(25500000,p); check(sdk.updatedDuration == 25500000 && sdk.updateCount == 1);
    bridge.updateViewLoadingTime(0,p); check(sdk.updatedDuration == 0 && sdk.updateCount == 2);
    bridge.updateViewLoadingTime(9007199254740991.0,p); check(sdk.updatedDuration == 9007199254740991L && sdk.updateCount == 3);
    for (double invalid: new double[]{-1, Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY, 1.5, 9007199254740992.0, 0x1p63}) {
      int before=p.rejected;
      bridge.updateViewLoadingTime(invalid,p);
      check(p.rejected == before + 1 && sdk.updateCount == 3 && sdk.updatedDuration == 9007199254740991L);
    }
    check(sdk.duration == 1000000 && sdk.name.equals("Manual"));
  }
}
''')
    run(['javac', '--release', '8', '-d', tmp, SDK / 'android/src/main/java/com/ft/sdk/reactnative/ViewTiming.java', java])
    run(['java', '-cp', tmp, 'com.ft.sdk.reactnative.ViewTimingTests'])
    print('PASS: production Android View bridge mapping and Manual compatibility', flush=True)
