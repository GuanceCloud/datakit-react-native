import { Navigation } from 'react-native-navigation';
import { FTRumViewTracking } from '@cloudcare/react-native-mobile';

type Appearance = { order: number; generation?: number };

/** Tracks screen events directly, including screens rendered with the JSX runtime. */
export class FTRumReactNativeNavigationTracking {
  private static tracker = new FTRumViewTracking();
  private static subscriptions: { remove(): void }[] = [];
  private static appearances = new Map<string, Appearance>();
  private static appearance = 0;
  private static lifecycle = 0;

  /** Call after RUM initialization and before displaying the navigation root. */
  static startTracking(): void {
    if (this.subscriptions.length) return;
    const lifecycle = ++this.lifecycle;
    const current = (): boolean => lifecycle === this.lifecycle;
    this.tracker.start();
    const events = Navigation.events();
    try {
      // Older releases expose only did-appear/disappear. Without a start
      // boundary, collect Views without reporting an appearance duration.
      if (typeof events.registerComponentWillAppearListener === 'function') {
        this.subscriptions.push(
          events.registerComponentWillAppearListener((event) => {
            if (!current() || event.componentType !== 'Component') return;
            const key = event.componentId;
            const existing = this.appearances.get(key);
            // A duplicate will-appear must not replace the original loading start.
            if (!existing || existing.order !== this.appearance) {
              this.appearances.set(key, { order: ++this.appearance });
            }
            this.tracker.setCurrent({ key, name: event.componentName });
            this.tracker.beginLoad(key);
          })
        );
      }
      this.subscriptions.push(
        events.registerComponentDidAppearListener((event) => {
          if (!current() || event.componentType !== 'Component') return;
          const key = event.componentId;
          const appearance = this.appearances.get(key);
          if (appearance && appearance.order !== this.appearance) return;
          const generation = this.tracker.show({
            key,
            name: event.componentName,
          });
          this.appearances.set(key, {
            order: appearance?.order ?? ++this.appearance,
            generation,
          });
        })
      );
      this.subscriptions.push(
        events.registerComponentDidDisappearListener((event) => {
          if (!current() || event.componentType !== 'Component') return;
          const key = event.componentId;
          const appearance = this.appearances.get(key);
          if (!appearance) return;
          // Retain the appearance's generation: foreground recovery owns a new one.
          this.tracker.hide(key, appearance.generation);
          this.appearances.delete(key);
        })
      );
    } catch (error) {
      this.stopTracking();
      throw error;
    }
  }

  static stopTracking(): void {
    ++this.lifecycle;
    this.subscriptions.forEach((subscription) => subscription.remove());
    this.subscriptions = [];
    this.appearances.clear();
    this.tracker.stop();
  }
}
