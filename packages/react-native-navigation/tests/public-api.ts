import { FTRumReactNativeNavigationTracking } from '../src';

// Compile-only checks of the application-facing registration API.
export function checkPublicAPI(): void {
  const start: void = FTRumReactNativeNavigationTracking.startTracking();
  const stop: void = FTRumReactNativeNavigationTracking.stopTracking();
  void start;
  void stop;
}
