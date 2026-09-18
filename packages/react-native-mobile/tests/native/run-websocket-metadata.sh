#!/bin/sh
set -eu
native_test_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
native_test_output=$(mktemp -d "${TMPDIR:-/tmp}/ft-websocket-tests.XXXXXX")
trap 'rm -rf "$native_test_output"' EXIT
xcrun clang -fobjc-arc -fobjc-arc-exceptions -fblocks -Wall -Wextra -Werror \
  -framework Foundation -framework CFNetwork \
  -I "$native_test_dir/../../ios" \
  "$native_test_dir/../../ios/FTWebSocketMetadataStore.m" \
  "$native_test_dir/../../ios/FTWebSocketResourceData.m" \
  "$native_test_dir/WebSocketMetadataTests.m" \
  -o "$native_test_output/websocket-metadata-tests"
"$native_test_output/websocket-metadata-tests"
for variant in normal missing argument return legacy legacy-getter init; do
  snapshot_flags=""
  case "$variant" in
    legacy) snapshot_flags="-DFT_TEST_LEGACY=1" ;;
    legacy-getter) snapshot_flags="-DFT_TEST_LEGACY=1 -DFT_TEST_BAD_GETTER=1" ;;
    init) snapshot_flags="-DFT_TEST_INIT_ARGUMENT=1" ;;
    missing) snapshot_flags="-DFT_TEST_MISSING_RESPONSE=1" ;;
    argument) snapshot_flags="-DFT_TEST_RESPONSE_ARGUMENT=1" ;;
    return) snapshot_flags="-DFT_TEST_RESPONSE_RETURN=1" ;;
  esac
  xcrun clang -fobjc-arc -fobjc-arc-exceptions -fblocks -Wall -Wextra -Werror $snapshot_flags \
    -framework Foundation -framework CFNetwork \
    -I "$native_test_dir/../../ios" \
    "$native_test_dir/../../ios/FTWebSocketMetadataStore.m" \
    "$native_test_dir/../../ios/FTWebSocketResourceData.m" \
    "$native_test_dir/WebSocketSnapshotTests.m" \
    -o "$native_test_output/websocket-snapshot-$variant"
done
# Execute the actual Trace bridge using minimal platform stubs. Temporary
# headers shadow dependencies only here; fresh RN codegen is compiled separately.
for header in FtMobileAgent.h React/RCTBridgeModule.h React/RCTConvert.h \
  GuanceSDK/FTMobileAgent.h GuanceSDK/FTExternalDataManager.h \
  GuanceSDK/FTExternalDataManager+Private.h GuanceSDK/FTResourceMetricsModel.h \
  GuanceSDK/FTResourceContentModel.h GuanceSDK/FTTraceManager.h; do
  mkdir -p "$native_test_output/$(dirname "$header")"
  printf '#import "TraceBridgeStubs.h"\n' > "$native_test_output/$header"
done
xcrun clang++ -x objective-c++ -std=c++17 -fobjc-arc -fobjc-arc-exceptions -fblocks -Wall -Wextra \
  -framework Foundation -I "$native_test_output" -I "$native_test_dir" -I "$native_test_dir/../../ios" \
  "$native_test_dir/../../ios/FTReactNativeTrace.mm" \
  "$native_test_dir/../../ios/FTWebSocketResourceData.m" \
  "$native_test_dir/TraceBridgeTests.mm" -o "$native_test_output/trace-bridge-tests"
"$native_test_output/trace-bridge-tests"
"$native_test_output/websocket-snapshot-normal"
"$native_test_output/websocket-snapshot-legacy" legacy
for variant in argument return missing legacy-getter init; do
  "$native_test_output/websocket-snapshot-$variant" "$variant"
done
