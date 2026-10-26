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
`FTRumNavigationTracking.test.ts` uses controlled clocks and AppState events for
load timing, one-time consumption, background recovery, expiry, duplicate/late
callbacks and delayed native Promise completion. `run-websocket-bridge.py` also
compiles the new RUM framework selectors against old/new architecture codegen.
These checks do not replace native SDK AppStateHistory or device upload tests.
