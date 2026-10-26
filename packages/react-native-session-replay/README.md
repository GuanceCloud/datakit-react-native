# Session Replay for React Native

Session Replay support for the Guance React Native SDK.

Use this package together with `@cloudcare/react-native-mobile` to capture user sessions and protect sensitive UI content with configurable privacy rules.

## Installation

```sh
npm install @cloudcare/react-native-session-replay
```

## Usage

```js
import {
  import {
  FTReactNativeSessionReplay,
  FTSessionReplayConfig,
  SessionReplayPrivacy,
} from '@cloudcare/react-native-session-replay';

// ...

```

## More

[View Doc Here](https://docs.guance.com/real-user-monitoring/session-replay/mobile/react-native/)

## License

Apache 2.0

### Sampling percentages

Use `sessionReplaySamplingRate` (default `100`) and `sessionReplayOnErrorSamplingRate` (default `0`) in `FTSessionReplayConfig`. Both accept percentages in `[0, 100]`: `0.1` means `0.1%`. Error sampling applies to sessions excluded by normal Replay sampling.

Legacy `sampleRate` and `sessionReplayOnErrorSampleRate` remain probabilities in `[0, 1]`. The corresponding percentage field takes precedence when both are supplied, including zero. Omitting a field retains the native default.

```typescript
await FTReactNativeSessionReplay.sessionReplayConfig({
  sessionReplaySamplingRate: 12.5,
  sessionReplayOnErrorSamplingRate: 100,
});
```
