# Guance React Navigation plugin

This plugin tracks React Navigation route changes as Guance RUM Views and
measures native-stack transition loading.

## Installation

```sh
yarn add @cloudcare/react-native-mobile @cloudcare/mobile-react-navigation
```

Keep your existing React Navigation dependencies. This package contains only
JavaScript and types; it adds no native linking or build configuration.
Initialize the mobile SDK and RUM before enabling View tracking.

## Route tracking

Use this mode for route changes, including nested navigators and tabs. It records
the current leaf route when the container is ready, then listens for changes.
It does not invent a loading duration when no transition boundary is available.

```tsx
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { FTRumReactNavigationTracking } from '@cloudcare/mobile-react-navigation';

const navigationRef = createNavigationContainerRef<RootStackParamList>();

<NavigationContainer
  ref={navigationRef}
  onReady={() => FTRumReactNavigationTracking.startTrackingViews(navigationRef)}
>
  {/* navigators */}
</NavigationContainer>;

// Before disposing this navigation container or shutting down the SDK:
FTRumReactNavigationTracking.stopTrackingViews(navigationRef);
```

Calling `startTrackingViews` repeatedly with the same ref registers once.
Registering another ref disposes the previous registration. A cleanup using an
old ref cannot stop the new registration.

## Transition loading

Choose this mode instead of `startTrackingViews` when using
`@react-navigation/native-stack`. Attach the listeners to the stack that owns the
screen transitions:

```tsx
import { FTRumReactNavigationTracking } from '@cloudcare/mobile-react-navigation';

<Stack.Navigator screenListeners={FTRumReactNavigationTracking.StackListener}>
  {/* screens */}
</Stack.Navigator>;

// Before disposing the tracked stack or shutting down the SDK:
FTRumReactNavigationTracking.stopTrackingViews();
```

Loading is the monotonic elapsed time from the observed `focus` callback to the
matching opening `transitionEnd` callback, reported in nanoseconds. For example,
25.5 ms is 25,500,000 ns. This measures the observed navigation transition, not
network completion or the full time until all screen content is rendered.
If a start boundary is absent or the duration is non-positive, the View is still
tracked without loading data. The initial screen may have no animated transition;
use route mode if every initial route must be recorded immediately.

Use one mode on one root container/owning stack at a time. Do not attach separate
timing listeners to every level of a nested navigator. Starting route tracking
switches off stack tracking, and acquiring `StackListener` switches to stack
tracking. After disposal, acquire `StackListener` again when mounting a new stack;
callbacks retained from the disposed registration are ignored.

## Lifecycle

Both modes use the SDK's shared automatic View lifecycle. Native handles closing
Views in the background. Foreground recovery starts the current screen once
without reusing old loading measurements. Route names become View names; route
keys distinguish separate appearances of screens with the same name.

## Migration

Replace the copied `example/src/FTRumReactNavigationTracking.tsx` import with
`@cloudcare/mobile-react-navigation`, retaining the class name and methods.
Remove the copied implementation so it cannot collect the same Views twice. Applications
using only this plugin do not need `react-native-navigation` or its Guance plugin.

## License

Apache 2.0
