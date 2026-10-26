import type {
  EventArg,
  NavigationContainerRef,
  Route,
} from '@react-navigation/native';
import {FTRumViewTracking} from '@cloudcare/react-native-mobile';

type NavigationListener = (event: EventArg<string, boolean, any>) => void;
type TrackedRoute = Route<string, any | undefined>;

/** Choose either StackListener (with load timing) or startTrackingViews. */
export class FTRumReactNavigationTracking {
  private static tracker = new FTRumViewTracking();
  private static registeredContainer: NavigationContainerRef<ReactNavigation.RootParamList> | null =
    null;
  private static currentTargetKey?: string;
  private static transitions = new Map<string, TrackedRoute>();
  static trackRouter: TrackedRoute | undefined;

  static startTrackingViews(
    ref: NavigationContainerRef<ReactNavigation.RootParamList> | null,
  ): void {
    if (!ref || this.registeredContainer === ref) return;
    if (this.registeredContainer)
      this.stopTrackingViews(this.registeredContainer);
    this.registeredContainer = ref;
    this.tracker.start();
    const route = ref.getCurrentRoute();
    if (route) this.show(route);
    ref.addListener('state', this.navigationListener);
  }

  static stopTrackingViews(
    ref: NavigationContainerRef<ReactNavigation.RootParamList> | null,
  ): void {
    if (ref !== this.registeredContainer) return;
    ref?.removeListener('state', this.navigationListener);
    this.registeredContainer = null;
    this.tracker.stop();
    this.transitions.clear();
    this.currentTargetKey = undefined;
    this.trackRouter = undefined;
  }

  static StackListener = {
    transitionEnd: (event: EventArg<string, boolean, any>): void => {
      // A new start closes the previous route. A late closing transition must
      // never issue an unscoped stop against the newly displayed route.
      if (event.data?.closing || !event.target) return;
      const route = this.transitions.get(event.target);
      this.transitions.delete(event.target);
      if (route && route.key === this.trackRouter?.key)
        this.show(route, event.target);
    },
    state: (event: EventArg<string, boolean, any>): void => {
      const outer = event.data?.state?.routes[event.data?.state?.index ?? 0];
      const route = this.leafRoute(outer);
      if (!route) return;
      this.trackRouter = route;
      this.tracker.setCurrent(route);
      if (outer.key === this.currentTargetKey) {
        this.transitions.clear();
        this.transitions.set(outer.key, route);
      } else {
        this.transitions.clear();
        this.show(route);
      }
      this.currentTargetKey = undefined;
    },
    focus: (event: EventArg<string, boolean, any>): void => {
      this.currentTargetKey = event.target;
      this.tracker.start();
      if (event.target) this.tracker.beginLoad(event.target);
    },
  };

  private static leafRoute(route: any): TrackedRoute | undefined {
    while (route?.state) {
      const child = route.state.routes?.[route.state.index ?? 0];
      if (!child) break;
      route = child;
    }
    return route;
  }

  private static show(route: TrackedRoute, loadingKey?: string): void {
    this.trackRouter = route;
    this.tracker.show(route, loadingKey);
  }

  private static navigationListener: NavigationListener = event => {
    const route =
      this.registeredContainer?.getCurrentRoute() ??
      this.leafRoute(event.data?.state?.routes[event.data?.state?.index ?? 0]);
    if (route) this.show(route);
  };
}
