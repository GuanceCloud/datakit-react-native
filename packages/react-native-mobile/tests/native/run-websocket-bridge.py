#!/usr/bin/env python3
"""Check the actual bridge against fresh codegen, including required selectors.

Uses installed RN/Pods headers and creates only temporary build artifacts.
This is a compiler regression check, not a simulator app or upload test.
"""
import argparse
import json
from pathlib import Path
import subprocess
import tempfile


def run(command):
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode:
        print(result.stdout + result.stderr, end="", flush=True)
    return result.returncode == 0


def verify(root, app, output, sdk):
    rn = root / app / "node_modules/react-native"
    pods = root / app / "ios/Pods"
    if not (rn / "package.json").is_file() or not (pods / "Headers/Public").is_dir():
        raise RuntimeError(f"Install React Native and CocoaPods dependencies for {app} first.")
    version = json.loads((rn / "package.json").read_text())["version"]
    output.mkdir()
    resolver = (
        "const {createRequire}=require('module');"
        "console.log(createRequire(process.argv[1]).resolve("
        "'@react-native/codegen/lib/cli/combine/combine-js-to-schema-cli.js'));"
    )
    combine = subprocess.check_output(
        ["node", "-e", resolver, str(rn / "package.json")], text=True
    ).strip()
    source = root / "packages/react-native-mobile"
    schema = output / "schema.json"
    if not run(["node", combine, str(schema),
                str(source / "src/specs/NativeFTReactNativeWebSocket.ts"),
                str(source / "src/specs/NativeFTReactNativeTrace.ts")]):
        return False
    if not run(["node", str(rn / "scripts/generate-specs-cli.js"),
                "-p", "ios", "-s", str(schema), "-o", str(output),
                "-n", "FTSdkReactNative", "-t", "modules"]):
        return False

    includes = [output, pods / "RCT-Folly", pods / "boost", pods / "DoubleConversion"]
    for visibility in ["Public", "Private"]:
        headers = pods / "Headers" / visibility
        if headers.is_dir():
            includes += [headers] + sorted(p for p in headers.iterdir() if p.is_dir())
    common = rn / "ReactCommon"
    includes += [common, common / "react/nativemodule/core/platform/ios",
                 common / "react/bridging", common / "callinvoker", common / "jsi"]
    flags = ["xcrun", "clang++", "-fobjc-arc", "-fobjc-arc-exceptions", "-fblocks",
             "-std=c++20", "-target", "arm64-apple-ios15.1-simulator", "-isysroot", sdk,
             "-DFOLLY_NO_CONFIG=1", "-DFOLLY_MOBILE=1", "-DFOLLY_USE_LIBCPP=1",
             "-DFOLLY_CFG_NO_COROUTINES=1", "-Werror=protocol",
             "-Werror=incomplete-implementation"]
    for include in includes:
        flags += ["-I", str(include)]
    passed = True
    for architecture in ["old", "new"]:
        for bridge in ["WebSocket", "Trace"]:
            command = flags + (["-DRCT_NEW_ARCH_ENABLED=1"] if architecture == "new" else [])
            command += ["-c", str(source / f"ios/FTReactNative{bridge}.mm"),
                        "-o", str(output / f"{architecture}-{bridge}.o")]
            success = run(command)
            print(f"{'PASS' if success else 'FAIL'}: RN {version}, {architecture} architecture, "
                  f"{bridge} bridge protocol check", flush=True)
            passed &= success
    return passed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--app", action="append", choices=["example", "example-new-architecture"],
                        help="Example to check; defaults to both installed RN versions")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[4]
    sdk = subprocess.check_output(
        ["xcrun", "--sdk", "iphonesimulator", "--show-sdk-path"], text=True
    ).strip()
    passed = True
    with tempfile.TemporaryDirectory(prefix="ft-websocket-bridge-") as directory:
        for app in args.app or ["example", "example-new-architecture"]:
            passed &= verify(root, app, Path(directory) / app, sdk)
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
