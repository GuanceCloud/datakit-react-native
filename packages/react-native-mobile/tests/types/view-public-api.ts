import { FTReactNativeRUM } from '../../src';
import type * as MobileSDK from '../../src';

// Compile-only API contract; this function is never executed.
export function checkPublicViewAPI(): void {
  void FTReactNativeRUM.onCreateView('Home', 25000000);
  void FTReactNativeRUM.startView('Home', { screen: 'home' });
  // @ts-expect-error Loading-start timestamps belong to the internal framework bridge.
  void FTReactNativeRUM.onCreateView('Home', 25000000, 1700000000001);
  // @ts-expect-error Tracking type belongs to the internal framework bridge.
  void FTReactNativeRUM.startView('Home', undefined, 1);
}

// @ts-expect-error The package must not export a public tracking type enum.
export type NoPublicTrackingType = MobileSDK.FTRUMViewTrackingType;
