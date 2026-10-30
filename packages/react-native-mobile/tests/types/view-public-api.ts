import { FTReactNativeRUM } from '../../src';
import type * as MobileSDK from '../../src';

// Compile-only API contract; this function is never executed.
export function checkPublicViewAPI(): void {
  void FTReactNativeRUM.onCreateView('Home', 25000000);
  void FTReactNativeRUM.startView('Home', { screen: 'home' });
  const update: Promise<void> =
    FTReactNativeRUM.updateViewLoadingTime(25500000);
  void update;
  // @ts-expect-error The loading duration must be a number, not a string.
  void FTReactNativeRUM.updateViewLoadingTime('25500000');
  // @ts-expect-error Loading-start timestamps belong to the internal framework bridge.
  void FTReactNativeRUM.onCreateView('Home', 25000000, 1700000000001);
  // @ts-expect-error Tracking type belongs to the internal framework bridge.
  void FTReactNativeRUM.startView('Home', undefined, 1);
}

// @ts-expect-error The package must not export a public tracking type enum.
export type NoPublicTrackingType = MobileSDK.FTRUMViewTrackingType;

// WebView host selection is available before configuring RUM or Log.
export function checkPublicWebViewHostAPI(): void {
  const configs: MobileSDK.FTMobileConfig[] = [
    {},
    { allowWebViewHost: null },
    { allowWebViewHost: [] },
    { allowWebViewHost: ['example.com'] },
  ];
  void configs;
  // @ts-expect-error Hosts must be an array or null, not a single string.
  const invalid: MobileSDK.FTMobileConfig = { allowWebViewHost: 'example.com' };
  void invalid;
}

export function checkPublicWebViewLogOverrideAPI(): void {
  const configs: MobileSDK.FTRemoteConfigOverrideValues[] = [
    {},
    { logEnableWebViewLog: true },
    { logEnableWebViewLog: false },
  ];
  void configs;
}
