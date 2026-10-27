# Guance React Native Navigation plugin

This plugin tracks Wix `react-native-navigation` screen appearances as Guance
RUM Views and measures appearance loading.

## Installation

```sh
yarn add @cloudcare/react-native-mobile @cloudcare/mobile-react-native-navigation
```

Keep your existing `react-native-navigation` dependency and its native setup.
This plugin contains only JavaScript and types; it adds no native linking or
build configuration.

## View tracking

Initialize the mobile SDK and RUM, then start tracking before displaying the
navigation root:

```ts
import { Navigation } from 'react-native-navigation';
import { FTRumReactNativeNavigationTracking } from '@cloudcare/mobile-react-native-navigation';

FTRumReactNativeNavigationTracking.startTracking();

Navigation.events().registerAppLaunchedListener(() => {
  // Register your screens, then display the root as usual.
  void Navigation.setRoot({
    root: { stack: { children: [{ component: { name: 'Home' } }] } },
  });
});

// Before shutting down the SDK or disposing the navigation integration:
FTRumReactNativeNavigationTracking.stopTracking();
```

`startTracking()` is idempotent. `stopTracking()` removes all registered global screen
listeners and the AppState subscription. You can start tracking again; callbacks
queued by an old registration cannot restart or stop the new registration's View.
Starting after a screen is already visible only tracks subsequent appearance
events, so start before `setRoot`.

The plugin listens directly to `componentDidAppear` and `componentDidDisappear`,
and to `componentWillAppear` when the navigation library exposes it. It works
without patching `React.createElement` and also
covers screens using the automatic JSX runtime. Only events with
`componentType: 'Component'` are treated as screens. Top bar titles, backgrounds,
and buttons are excluded. `componentName` becomes the View name and `componentId`
identifies the screen instance.

## Loading and lifecycle

Loading is the monotonic elapsed time from `componentWillAppear` to
`componentDidAppear`, reported in nanoseconds: 25.5 ms is 25,500,000 ns. This is the
observed appearance interval, not the completion of asynchronous content loading.
If the navigation library has no will-appear API, Views are collected without
loading data. Missing starts and non-positive durations also omit loading data.
Duplicate callbacks do not submit loading twice. Native closes automatic Views in
the background; foreground recovery starts the current screen without replaying
old loading data. A late disappearance from the previous screen cannot close a
different active screen.

Use one automatic navigation integration at a time. The SDK has one active View;
when multiple screens are simultaneously visible, the latest accepted appearance
owns it. This package does not need React Navigation or
`@cloudcare/mobile-react-navigation`.

## Migration

Replace the copied `example/src/FTRumReactNativeNavigationTracking.tsx` import
with `@cloudcare/mobile-react-native-navigation`, retaining the class name and
methods. Remove the copied implementation so it cannot collect Views twice.

## License

Apache 2.0
