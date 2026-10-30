# Native WebSocket regression tests

Run the deterministic metadata, Resource normalization, lifecycle and response
snapshot tests on macOS with Xcode command-line tools:

```sh
sh packages/react-native-mobile/tests/native/run-websocket-metadata.sh
```

The runner compiles the production `FTWebSocketMetadataStore` and
`FTWebSocketResourceData` implementations with an SR-compatible test double. It
uses a controlled monotonic clock and temporary output, and does not require a
network server. It also verifies supported response-completion signatures and
safe fallback when a SocketRocket method is absent or incompatible, including
native Resource reporting and URL policy when no RN socket owner is available.

The runner also executes the production Trace bridge with dependency stubs to
check cancellation before Resource start, idempotency, weak ownership, late
cancellation and SDK exceptions. It asserts that cancellation never obtains a
singleton or removes another request's correlation.

Check the production iOS WebSocket and Trace bridges against freshly generated React
Native Codegen protocols:

```sh
python3 packages/react-native-mobile/tests/native/run-websocket-bridge.py
```

This requires installed JavaScript and CocoaPods dependencies in `example` and
`example-new-architecture`. It compiles the bridge for both old and new
architectures and fails on missing or mismatched protocol methods. Select one
workspace with `--app example` or `--app example-new-architecture`.

These tests do not perform RUM upload or console acceptance checks.

WebSocket capture-boundary and native duration checks:

```sh
python3 packages/react-native-mobile/tests/native/run-websocket-timing.py
```

Requires GuanceSDK 1.6.8 sources installed in `example/ios/Pods`. The runner compiles
the production Resource normalizer and bridge conversion against the installed
SDK's model headers, and extracts its actual interval-selection, fetch-interval,
and final duration calculation code. Platform conversion/reporting dependencies
are doubles; this is not a complete RUM pipeline or device upload test.
It asserts exact epoch nanoseconds and a 25,000,001 ns duration across delayed
start/stop processing, including both calls processed at the same time. Both
reporting routes and missing response metadata are covered, along with measured
zero, one-nanosecond precision, Int64 limits, malformed/missing/reversed timestamps,
HTTP protocol preservation, and unchanged public manual HTTP metric mapping.
The JS WebSocket tests separately cover delayed Promise replies, business callback
work, duplicate/late events, wall-clock corrections, and unavailable clocks.

Visitor ID mapping checks:

```sh
python3 packages/react-native-mobile/tests/native/run-visitor-id-config.py
```

This compiles the production iOS mapping function and Android mapper against the real native config implementations from `/private/tmp/native-adapter-cache` (iOS `1.6.8`, Android `agent_1.7.6`). It verifies 24-hour defaults, a 0.5-hour TTL (1,800,000 ms on Android), OR matching, origin restrictions, WebSocket URL exclusion, missing config and invalid regex handling. Native ID persistence and request lifetime logic are delegated to the SDK; this is not a live network or device test.

`run-websocket-bridge.py` also checks the RUM and Mobile bridges against freshly generated old/new architecture protocols, including `resetVisitorId`.

Automatic View bridge timing checks:

```sh
python3 packages/react-native-mobile/tests/native/run-view-timing.py
```

Compiles the production iOS and Java 8 conversion helpers and verifies exact integer
nanoseconds, fractional milliseconds, invalid values and Int64 overflow boundaries.
It also compiles the production bridge entry points with recording SDK doubles to
check forwarded values, Automatic tracking type, invalid-type rejection and legacy
Manual calls.
It also verifies `updateViewLoadingTime` forwards exact nanoseconds (including
zero and the maximum JS safe integer), rejects invalid values without replacing
the prior duration, and maps to Android's `updateLoadTime` / iOS's
`updateViewLoadingTime:` without creating or starting another View.
`FTRumNavigationTracking.test.ts` uses controlled clocks and AppState events for
load timing, one-time consumption, background recovery, expiry, duplicate/late
callbacks and delayed native Promise completion. `run-websocket-bridge.py` also
compiles the new RUM framework selectors against old/new architecture codegen.
These checks do not replace native SDK AppStateHistory or device upload tests.

Shared WebView host configuration checks:

```sh
python3 packages/react-native-mobile/tests/native/run-webview-host-config.py \
  --android-sdk-repo /path/to/ft-sdk-android
```

Requires Xcode command-line tools, a JDK supporting `javac --release 8`, installed
GuanceSDK 1.6.8 sources in `example/ios/Pods` (or `--ios-sdk-sources`), and an Android
SDK checkout containing the `agent_1.7.6` tag. It compiles the production RN host
mapping blocks with the native SDK's host setters and selection policy. It checks
omitted, null, empty and explicit host lists, legacy RUM fallback, base configuration
precedence, operation without RUM, and remote configuration precedence. Android
code compiles with Java 8 compatibility. Remaining SDK/RN dependencies are doubles;
this does not exercise a device WebView or remote configuration fetching.
It also verifies `logEnableWebViewLog` override mapping and the native log config
merge for true/false values, leaving the remote value unchanged when an override
is omitted or null, and retaining the local log switch when no remote value exists.
