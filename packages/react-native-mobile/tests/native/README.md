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
