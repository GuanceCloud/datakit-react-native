import type {
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';
import { FTRumViewTracking } from '@cloudcare/react-native-mobile';

type TrackedRoute = {
  key: string;
  name: string;
  state?: { index?: number; routes: readonly TrackedRoute[] };
};
type StackEvent = {
  target?: string;
  data?: {
    closing?: boolean;
    state?: { index?: number; routes: readonly TrackedRoute[] };
  };
};
type Appearance = {
  target: string;
  route: { key: string; name: string };
  generation?: number;
  first: boolean;
};
type Transition = { target: string; start: number; end?: number };
const MAX_TRANSITION_MS = 15 * 60 * 1000;

export type FTRumStackListeners = {
  focus(event: StackEvent): void;
  state(event: StackEvent): void;
  transitionStart(event: StackEvent): void;
  transitionEnd(event: StackEvent): void;
  gestureCancel(event: StackEvent): void;
};

/** One active navigation container, using either route or stack tracking. */
export class FTRumReactNavigationTracking {
  private static tracker = new FTRumViewTracking(() => {
    this.transition = undefined;
    if (this.appearance) this.appearance.first = false;
  });
  private static registeredContainer: object | null = null;
  private static unsubscribe?: () => void;
  private static lifecycle = 0;
  private static stackListeners?: FTRumStackListeners;
  private static visited = new Set<string>();
  private static appearance?: Appearance;
  private static transition?: Transition;
  static trackRouter: TrackedRoute | undefined;

  /** Call from NavigationContainer.onReady. This mode does not measure loading. */
  static startTrackingViews<ParamList extends ParamListBase>(
    ref: NavigationContainerRef<ParamList> | null
  ): void {
    if (!ref || this.registeredContainer === ref) return;
    this.stopTrackingViews();
    this.registeredContainer = ref;
    this.tracker.start();
    const lifecycle = this.lifecycle;
    this.unsubscribe = ref.addListener('state', () => {
      if (lifecycle !== this.lifecycle) return;
      const route = ref.getCurrentRoute();
      if (route) this.show(route);
    });
    const route = ref.getCurrentRoute();
    if (route) this.show(route);
  }

  /** Omit ref to dispose stack tracking. Old containers cannot stop a new one. */
  static stopTrackingViews(ref?: object | null): void {
    if (ref !== undefined && ref !== this.registeredContainer) return;
    ++this.lifecycle;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.registeredContainer = null;
    this.stackListeners = undefined;
    this.tracker.stop();
    this.visited.clear();
    this.appearance = undefined;
    this.transition = undefined;
    this.trackRouter = undefined;
  }

  /** Track Views on state changes; time first focus through opening transitionEnd. */
  static get StackListener(): FTRumStackListeners {
    if (this.stackListeners) return this.stackListeners;
    this.stopTrackingViews();
    const lifecycle = this.lifecycle;
    const current = (): boolean => lifecycle === this.lifecycle;
    this.stackListeners = {
      transitionStart: (event): void => {
        if (current() && event.target && event.data?.closing === true)
          this.cancelTransition(event.target);
      },
      transitionEnd: (event): void => {
        const end = this.monotonicNow();
        if (!current() || !event.target) return;
        if (event.data?.closing === true) {
          this.cancelTransition(event.target);
          return;
        }
        if (event.data?.closing !== false) {
          this.cancelTransition(event.target);
          return;
        }
        if (this.transition?.target === event.target) {
          // Capture the end now, even when the matching state arrives later.
          if (this.transition.end === undefined) this.transition.end = end;
          this.finishTransition();
        } else if (this.appearance?.target === event.target) {
          // No observed focus: do not infer a start from a later callback.
          this.appearance.first = false;
        }
      },
      gestureCancel: (): void => {
        if (!current()) return;
        this.transition = undefined;
        if (this.appearance) this.appearance.first = false;
      },
      state: (event): void => {
        if (!current()) return;
        const state = event.data?.state;
        if (!state) return;
        const outer = state.routes[state.index ?? 0];
        const leaf = this.leafRoute(outer);
        if (!outer || !leaf) {
          this.tracker.stop();
          this.visited.clear();
          this.appearance = undefined;
          this.transition = undefined;
          this.trackRouter = undefined;
          return;
        }
        // Retain instance history only while its route remains in this stack.
        const keys = new Set(state.routes.map((route) => route.key));
        for (const key of this.visited) {
          if (!keys.has(key)) this.visited.delete(key);
        }
        if (this.transition && this.transition.target !== outer.key)
          this.transition = undefined;
        const previous = this.appearance;
        if (previous?.target !== outer.key || previous.route.key !== leaf.key) {
          const route = { key: leaf.key, name: leaf.name };
          const first = !this.visited.has(outer.key) && outer.key === leaf.key;
          this.visited.add(outer.key);
          this.appearance = {
            target: outer.key,
            route,
            first,
            generation: this.show(route),
          };
        } else {
          this.tracker.setCurrent(previous.route);
        }
        this.finishTransition();
      },
      focus: (event): void => {
        const start = this.monotonicNow();
        if (!current() || !event.target) return;
        this.tracker.start();
        const appearance = this.appearance;
        // A newly selected route invalidates the previous appearance even if
        // React Navigation has not delivered the matching state update yet.
        if (appearance?.target !== event.target) {
          if (appearance) appearance.first = false;
          if (this.transition?.target !== event.target)
            this.transition = undefined;
        }
        // Keep the first focus boundary. Existing instances (including nested
        // containers) may open Views again, but never start another load timer.
        if (
          (this.visited.has(event.target) &&
            (appearance?.target !== event.target || !appearance.first)) ||
          this.transition?.target === event.target
        )
          return;
        this.transition = { target: event.target, start };
      },
    };
    return this.stackListeners;
  }

  private static finishTransition(): void {
    const transition = this.transition;
    const appearance = this.appearance;
    if (
      !transition ||
      transition.end === undefined ||
      !appearance ||
      appearance.target !== transition.target
    )
      return;
    this.transition = undefined;
    const eligible = appearance.first;
    appearance.first = false;
    const elapsed = transition.end - transition.start;
    if (
      !eligible ||
      !Number.isFinite(elapsed) ||
      elapsed <= 0 ||
      elapsed >= MAX_TRANSITION_MS
    )
      return;
    this.tracker.updateLoadingTime(
      appearance.route.key,
      appearance.generation,
      Math.floor(elapsed * 1000000)
    );
  }

  private static cancelTransition(target: string): void {
    if (this.transition?.target === target) this.transition = undefined;
    if (this.appearance?.target === target) this.appearance.first = false;
  }

  private static monotonicNow(): number {
    return typeof performance !== 'undefined' &&
      typeof performance.now === 'function'
      ? performance.now()
      : NaN;
  }

  private static leafRoute(
    route: TrackedRoute | undefined
  ): TrackedRoute | undefined {
    while (route?.state) {
      const child = route.state.routes[route.state.index ?? 0];
      if (!child) break;
      route = child;
    }
    return route;
  }

  private static show(route: TrackedRoute): number | undefined {
    this.trackRouter = route;
    return this.tracker.show(route);
  }
}
