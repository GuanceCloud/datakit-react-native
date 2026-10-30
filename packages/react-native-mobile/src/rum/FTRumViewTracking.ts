import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { FTReactNativeRUM } from '../ft_rum';
import { bridgeContextManager } from '../ft_mobile_agent';
import type { Spec as NativeRUMSpec } from '../specs/NativeFTReactNativeRUM';

type Route = { key: string; name: string };
type Loading = { monotonicMs: number; epochMs: number };
const MAX_PENDING_LOAD_MS = 15 * 60 * 1000;

/** Shared lifecycle coordinator for navigation adapters. Use one per navigator. */
export class FTRumViewTracking {
  private current?: Route;
  private active?: { key: string; generation: number };
  private generation = 0;
  private lifecycle = 0;
  private state: AppStateStatus | null = null;
  private subscription?: { remove(): void };
  private loading = new Map<string, Loading>();

  constructor(private readonly onBackground?: () => void) {}

  start(): void {
    if (this.subscription) return;
    this.state = AppState.currentState;
    const lifecycle = ++this.lifecycle;
    const listener = (state: AppStateStatus): void => {
      if (lifecycle === this.lifecycle) this.onAppState(state);
    };
    const subscription = AppState.addEventListener('change', listener);
    // RN < 0.65 uses removeEventListener instead of returning a subscription.
    const legacyAppState = AppState as typeof AppState & {
      removeEventListener?: (type: string, callback: typeof listener) => void;
    };
    this.subscription = subscription || {
      remove: () => legacyAppState.removeEventListener?.('change', listener),
    };
  }

  /** Capture both clocks at the loading boundary, before any async work. */
  beginLoad(key: string): void {
    this.start();
    this.pruneLoading();
    if (this.state === 'background' || this.loading.has(key)) return;
    if (
      typeof performance === 'undefined' ||
      typeof performance.now !== 'function'
    )
      return;
    // Only the latest transition can supply loading for this navigator.
    this.loading.clear();
    this.loading.set(key, {
      monotonicMs: performance.now(),
      epochMs: Date.now(),
    });
  }

  /** Remember a transitioning route so foreground recovery uses the current page. */
  setCurrent(route: Route): void {
    this.start();
    this.current = { key: route.key, name: route.name };
  }

  show(route: Route, loadingKey: string = route.key): number | undefined {
    this.setCurrent(route);
    this.pruneLoading();
    const loading = this.loading.get(loadingKey);
    this.loading.clear();
    if (this.state !== 'active') return undefined;
    if (this.active?.key === route.key) return this.active.generation;
    this.active = { key: route.key, generation: ++this.generation };
    if (loading) {
      const durationNs = Math.floor(
        (performance.now() - loading.monotonicMs) * 1000000
      );
      if (Number.isFinite(durationNs) && durationNs > 0) {
        this.report(
          this.nativeRUM.onCreateViewWithLoadStart(
            route.name,
            durationNs,
            Number.isFinite(loading.epochMs) ? loading.epochMs : 0
          )
        );
      }
    }
    // Enqueue these calls together. Waiting for a Promise here could start a stale
    // page after background/route changes; native consumes loading before start.
    this.report(
      this.nativeRUM.startViewWithTrackingType(
        route.name,
        bridgeContextManager.mergeWithLocalPropertiesSync(),
        1 // Automatic is an internal framework bridge detail.
      )
    );
    return this.active.generation;
  }

  /** Apply a completed interval only to the appearance that started it. */
  updateLoadingTime(
    key: string,
    generation: number | undefined,
    durationNs: number
  ): void {
    if (
      this.state !== 'active' ||
      !this.active ||
      this.active.key !== key ||
      this.active.generation !== generation ||
      !Number.isSafeInteger(durationNs) ||
      durationNs <= 0
    )
      return;
    // Enqueue immediately; never let a Promise continuation update another View.
    this.report(FTReactNativeRUM.updateViewLoadingTime(durationNs));
  }

  /** Only the appearance that owns the active generation may close it. */
  hide(key: string, generation: number | undefined): void {
    if (this.state !== 'active') return;
    if (
      !this.active ||
      this.active.key !== key ||
      this.active.generation !== generation
    )
      return;
    this.active = undefined;
    this.current = undefined;
    this.report(FTReactNativeRUM.stopView());
  }

  stop(): void {
    ++this.lifecycle;
    this.subscription?.remove();
    this.subscription = undefined;
    if (this.active && this.state === 'active')
      this.report(FTReactNativeRUM.stopView());
    this.active = undefined;
    this.current = undefined;
    this.loading.clear();
    // Never reuse generation values: callbacks from a previous subscription can arrive late.
  }

  private onAppState = (state: AppStateStatus): void => {
    if (state === this.state) return;
    this.state = state;
    if (state === 'background') {
      // Native closes Automatic Views at its own history boundary. No JS stop.
      this.active = undefined;
      this.loading.clear();
      this.onBackground?.();
    } else if (state === 'active' && this.current) {
      this.show(this.current);
    }
  };

  private pruneLoading(): void {
    const now =
      typeof performance !== 'undefined' &&
      typeof performance.now === 'function'
        ? performance.now()
        : NaN;
    for (const [key, load] of this.loading) {
      const age = now - load.monotonicMs;
      if (!Number.isFinite(age) || age < 0 || age >= MAX_PENDING_LOAD_MS)
        this.loading.delete(key);
    }
  }

  private get nativeRUM(): NativeRUMSpec {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('../specs/NativeFTReactNativeRUM').default;
  }

  private report(result: Promise<void>): void {
    result.catch((error) =>
      console.warn('[Guance] Automatic View tracking failed', error)
    );
  }
}
