import type { ComponentProps } from 'react';
import {
  createNavigationContainerRef,
  NavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FTRumReactNavigationTracking } from './plugin';

type Routes = { Home: undefined; Detail: { id: string } };

export function checkPublicAPI(ref: NavigationContainerRef<Routes>): void {
  FTRumReactNavigationTracking.startTrackingViews(ref);
  FTRumReactNavigationTracking.startTrackingViews(
    createNavigationContainerRef<Routes>()
  );
  FTRumReactNavigationTracking.stopTrackingViews(ref);
  const Stack = createNativeStackNavigator<Routes>();
  const listeners: ComponentProps<typeof Stack.Navigator>['screenListeners'] =
    FTRumReactNavigationTracking.StackListener;
  void listeners;
}
