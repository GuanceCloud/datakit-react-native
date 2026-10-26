# Automatic View runtime smoke test

This entry runs the real SDK and `FTRumViewTracking` on iOS/Android. It disables
native screen auto-tracking and uses only a local collector, without loading
`example/index.tsx` or its remote SDK configuration. The application-facing RUM
API is unchanged. Use an isolated test device/emulator and a Debug example build
that contains the new framework bridge methods.

From `example`, build both bundles (Metro must have access to its normal caches):

```sh
node node_modules/react-native/cli.js bundle --platform ios --entry-file tests/view-lifecycle.tsx --bundle-output /tmp/rn-view-test-ios.bundle --dev true --minify false --max-workers 2
node node_modules/react-native/cli.js bundle --platform android --entry-file tests/view-lifecycle.tsx --bundle-output /tmp/rn-view-test-android.bundle --dev true --minify false --max-workers 2
python3 tests/view-lifecycle-server.py
```

The server binds only `127.0.0.1:8081` (bundle) and `127.0.0.1:8765` (collector).
Stop any other Metro server on that port first. For Android, reverse both ports
with `adb -s <serial> reverse tcp:8081 tcp:8081` and the same command for 8765.
The collector appends to `/tmp/rn-view-runtime-events.jsonl`; move any prior run's
file aside before starting a new run.

Launch the example and wait for a `READY` marker and an active `RuntimeAuto-*`
View in the collector. Send the app to the background using Home (or open system
Settings on iOS). **Wait for the closed View upload before restoring foreground**;
native uploads may be delayed by batching/background scheduling. Restore the app
and wait for a new active View. Repeat for the other platform.

```sh
python3 tests/assert-view-lifecycle.py /tmp/rn-view-runtime-events.jsonl
```

The assertion requires, on each platform: the same View transitions from
`is_active=true` to `false` following a background marker; foreground restoration
creates a distinct ID without a `loading_time`; no `JS_STOP_VIEW` or error marker
is recorded. This proves actual automatic View closure for the tested build and
coordinator. It does not exercise every navigation-library callback order, manual
View controls, pending Resources/Actions or all AppStateHistory edge cases.
