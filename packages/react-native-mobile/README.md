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
