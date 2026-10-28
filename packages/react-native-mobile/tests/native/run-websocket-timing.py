#!/usr/bin/env python3
"""Exercise production Resource conversion and installed SDK timing selection.

Requires GuanceSDK 1.6.8 sources installed in example/ios/Pods. Platform bridges
and the writer are doubles; native timing methods are extracted without changes.
This checks exact final interval/duration selection, not device upload.
"""
from pathlib import Path
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[4]
SDK = ROOT / 'packages/react-native-mobile'
PODS = ROOT / 'example/ios/Pods'
NATIVE = PODS / 'GuanceSDK/Sources/Core'


def method(source, signature):
    start = source.index(signature)
    opening = source.index('{', start)
    depth, end = 1, opening + 1
    while depth:
        depth += (source[end] == '{') - (source[end] == '}')
        end += 1
    return source[start:end]


if not re.search(r'  - GuanceSDK \(1\.6\.8\):', (PODS / 'Manifest.lock').read_text()):
    raise SystemExit('Install the pinned GuanceSDK 1.6.8 in example/ios first.')
handler = (NATIVE / 'FTRUM/RUMCore/FTRUMResourceHandler.m').read_text()
metrics = (NATIVE / 'BaseUtils/Base/FTResourceMetricsModel.m').read_text()
duration = re.search(r'NSNumber \*duration = timing.valid.*?;', handler, re.S).group()
with tempfile.TemporaryDirectory(prefix='ft-websocket-timing-') as directory:
    tmp = Path(directory)
    (tmp / 'GuanceSDK').mkdir()
    (tmp / 'React').mkdir()
    for name in ['FTResourceMetricsModel.h', 'FTResourceContentModel.h']:
        (tmp / 'GuanceSDK' / name).write_text((NATIVE / 'BaseUtils/include' / name).read_text())
    (tmp / 'GuanceSDK/FTExternalDataManager.h').write_text('''#import <Foundation/Foundation.h>
#import <GuanceSDK/FTResourceMetricsModel.h>
#import <GuanceSDK/FTResourceContentModel.h>
@interface FTExternalDataManager : NSObject
+ (instancetype)sharedManager;
- (void)addResourceWithKey:(NSString *)key metrics:(FTResourceMetricsModel *)metrics content:(FTResourceContentModel *)content;
@end
''')
    (tmp / 'React/RCTConvert.h').write_text('''#import <Foundation/Foundation.h>
@interface RCTConvert : NSObject
+ (NSNumber *)NSNumber:(id)value;
+ (NSDictionary *)NSDictionary:(id)value;
+ (NSString *)NSString:(id)value;
+ (NSURL *)NSURL:(id)value;
+ (int)int:(id)value;
+ (NSInteger)NSInteger:(id)value;
+ (BOOL)BOOL:(id)value;
@end
''')
    (tmp / 'NativeResourceTiming.inc').write_text(
        '@implementation FTResourceMetricsModel\n' + method(metrics, '- (NSNumber *)fetchInterval') + '\n@end\n'
        '@implementation TimingHandler\n' + method(handler, '- (FTRUMResourceTiming)timingForModel:') + '\n'
        '- (NSNumber *)durationForModel:(FTRUMResourceDataModel *)model {\n'
        'FTRUMResourceTiming timing = [self timingForModel:model];\n'
        'NSDate *fallbackEnd = self.time;\n' + duration + '\nreturn duration;\n}\n@end\n'
    )
    subprocess.run([
        'xcrun', 'clang', '-fobjc-arc', '-fblocks', '-Wno-incomplete-implementation',
        '-Wno-deprecated-declarations', '-framework', 'Foundation',
        '-I', str(tmp), '-I', str(SDK / 'ios'),
        str(SDK / 'ios/FTReactNativeResource.m'),
        str(SDK / 'ios/FTWebSocketResourceData.m'),
        str(SDK / 'tests/native/ResourceTimingTests.m'), '-o', str(tmp / 'test')
    ], check=True)
    subprocess.run([str(tmp / 'test')], check=True)
