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

Views start when the selected route changes, including the initial screen and
screens without animations. Loading is recorded only for a route instance's
first appearance, from its first observed `focus` to the matching opening
`transitionEnd`. The interval uses a monotonic clock and is reported in
nanoseconds; for example, 500 ms is 500,000,000 ns. Repeated focus events do not
replace the original start, and `transitionStart` is not required.

Returning to an existing route, changing tabs, and foreground recovery create
Views without repeating loading measurements. An outer stack's transition is
never assigned to a nested leaf screen. Missing, cancelled, backgrounded, or
invalid intervals are discarded. Loading is applied only while the same View
appearance remains active.

This measures the interval between JavaScript focus and transition-end callbacks. It does not
measure network completion or when all screen content is ready, and native-to-JS
event delivery delays can affect the observed interval.

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
