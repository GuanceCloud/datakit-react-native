# react-native-mobile

Base On Guance Android iOS React Native SDK

## Installation

```sh
npm install @cloudcare/react-native-mobile
```

## Usage

```js
import {
  FTMobileReactNative,
  FTReactNativeLog,
  FTReactNativeTrace,
  FTReactNativeRUM,
  FTMobileConfig,
  FTLogConfig,
  FTTraceConfig,
  FTRUMConfig,
  MonitorType,
  TraceType
} from '@cloudcare/react-native-mobile';

// ...

```

## WebSocket handshake tracking

To collect iOS WebSocket handshakes while native Resource auto-collection is disabled:

```ts
await FTReactNativeRUM.setConfig({
  androidAppId: 'YOUR_ANDROID_APP_ID',
  iOSAppId: 'YOUR_IOS_APP_ID',
  enableNativeUserResource: false,
  enableIOSWebSocketResource: true,
});
```

`enableIOSWebSocketResource` defaults to `false` and is independent of
`enableNativeUserResource`. It only affects iOS; Android WebSocket collection
continues through the native SDK under `enableNativeUserResource`.
When disabled, new iOS connections are not instrumented or injected with
WebSocket Trace headers. Handshakes already started can finish normally.
When enabled, Trace injection additionally requires `enableNativeAutoTrace`.
Only connections created after tracking starts are observed.

iOS starts JS capture and native setup together, without waiting for a native
readiness reply. JS measures the handshake and injects Trace headers; the native
bridge handles Resource reporting and optionally adds a response snapshot.
Missing socket association keeps the native URL filtering, sampling and privacy
path. Only older native packages without this bridge use the legacy JS route.
Connections created before the hooks are installed may have no native snapshot.

iOS handshake tracking reads `error.message` first. When it is absent, the SDK
can use `close.reason` from the immediately following abnormal close (`1006`),
before the next microtask. The first error still ends handshake timing; normal
close reasons are not collected. Native HTTP response snapshots take precedence
over error-text inference.

## More

[View Doc Here](https://docs.guance.com/real-user-monitoring/react-native/app-access/)

## License

Apache 2.0

### Automatic View framework integration

Use the updated `example/src/FTRumReactNavigationTracking.tsx` (React Navigation)
or `example/src/FTRumReactNativeNavigationTracking.tsx` (React Native Navigation)
with this SDK. React Navigation supports either `StackListener` for transition
load timing or `startTrackingViews(ref)` for route tracking; choose one.
Both adapters share `FTRumViewTracking`, which internally records the loading
start and marks native Views as Automatic. Neither the loading-start parameter
nor the tracking type is exposed on the application-facing `FTReactNativeRUM` API.

For custom navigation adapters, use the coordinator at the actual lifecycle
boundaries:

```ts
const tracker = new FTRumViewTracking();
tracker.start();
// When loading begins:
tracker.beginLoad(route.key);
// When the page is first displayed:
const appearance = tracker.show({ key: route.key, name: route.name });
// When that appearance disappears:
tracker.hide(route.key, appearance);
// When the adapter is disposed:
tracker.stop();
```

The coordinator computes loading duration with a monotonic clock in nanoseconds
and captures the actual loading-start Unix timestamp in milliseconds. It passes
these values through an internal bridge; the native bridges validate the timestamp
and convert it to integer nanoseconds without adding precision. Missing,
non-positive, non-finite or overflowing starts fall back to View start. Native
also requires a positive duration and a loading start strictly before View start.

The public signatures remain `onCreateView(name, loadTime)` (nanosecond duration)
and `startView(name, properties?)` (Manual lifecycle).

Native owns background closure for Automatic Views and their associated Actions.
Adapters must discard pending loading on background and must not send another
background `stopView`. On foreground, restart the current page without resending
old loading; Native creates a new View ID. `FTRumViewTracking` deduplicates route
and foreground callbacks, consumes each measured load once, discards pending
loads after 15 minutes or a monotonic clock rollback, and guards disappearance
callbacks with appearance generations. React Navigation's timing starts at its
observed focus callback and ends at the matching opening transition-end callback;
React Native Navigation uses component-will-appear to component-did-appear. Routes
without a measured start are tracked without loading data.

Keep normal route changes in the adapter. A new Native View start closes the
previous View, so an old closing transition must not send an unscoped stop. For
custom adapters using `FTRumViewTracking`, retain the generation returned by
`show` and pass it to `hide`; never look up a new generation in a delayed callback.
Call `stopTrackingViews(ref)` / `stopTracking()` when disposing the adapter.
Existing `startView(name, properties)` calls retain **Manual** semantics. Native
fallback Views and pending Resources retain their existing SDK lifecycle.
