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

export type FTRumStackListeners = {
  focus(event: StackEvent): void;
  state(event: StackEvent): void;
  transitionEnd(event: StackEvent): void;
};

/** One active navigation container, using either route or stack tracking. */
export class FTRumReactNavigationTracking {
  private static tracker = new FTRumViewTracking();
  private static registeredContainer: object | null = null;
  private static unsubscribe?: () => void;
  private static lifecycle = 0;
  private static stackListeners?: FTRumStackListeners;
  private static currentTargetKey?: string;
  private static transitions = new Map<string, TrackedRoute>();
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
    this.transitions.clear();
    this.currentTargetKey = undefined;
    this.trackRouter = undefined;
  }

  /** Pass to native-stack screenListeners; focus -> opening transitionEnd timing. */
  static get StackListener(): FTRumStackListeners {
    if (this.stackListeners) return this.stackListeners;
    this.stopTrackingViews();
    const lifecycle = this.lifecycle;
    const current = (): boolean => lifecycle === this.lifecycle;
    this.stackListeners = {
      transitionEnd: (event): void => {
        // A new View closes the previous one; late closing events cannot stop it.
        if (!current() || event.data?.closing || !event.target) return;
        const route = this.transitions.get(event.target);
        this.transitions.delete(event.target);
        if (route && route.key === this.trackRouter?.key)
          this.show(route, event.target);
      },
      state: (event): void => {
        if (!current()) return;
        const state = event.data?.state;
        const outer = state?.routes[state.index ?? 0];
        const route = this.leafRoute(outer);
        if (!outer || !route) return;
        this.trackRouter = route;
        this.tracker.setCurrent(route);
        const transitioning =
          outer.key === this.currentTargetKey ||
          this.transitions.has(outer.key);
        this.transitions.clear();
        if (transitioning) {
          this.transitions.set(outer.key, route);
        } else {
          this.show(route);
        }
        this.currentTargetKey = undefined;
      },
      focus: (event): void => {
        if (!current()) return;
        this.currentTargetKey = event.target;
        this.tracker.start();
        if (event.target) this.tracker.beginLoad(event.target);
      },
    };
    return this.stackListeners;
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

  private static show(route: TrackedRoute, loadingKey?: string): void {
    this.trackRouter = route;
    this.tracker.show(route, loadingKey);
  }
}
