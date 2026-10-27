import type { ComponentProps } from 'react';
import {
  createNavigationContainerRef,
  NavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FTRumReactNavigationTracking } from '../src';

type Routes = { Home: undefined; Detail: { id: string } };

// Compile-only checks against the navigation libraries' actual exported types.
export function checkPublicAPI(ref: NavigationContainerRef<Routes>): void {
  FTRumReactNavigationTracking.startTrackingViews(ref);
  FTRumReactNavigationTracking.startTrackingViews(
    createNavigationContainerRef<Routes>()
  );
  FTRumReactNavigationTracking.startTrackingViews(null);
  FTRumReactNavigationTracking.stopTrackingViews(ref);
  FTRumReactNavigationTracking.stopTrackingViews();
  const Stack = createNativeStackNavigator<Routes>();
  const listeners: ComponentProps<typeof Stack.Navigator>['screenListeners'] =
    FTRumReactNavigationTracking.StackListener;
  void listeners;
}
