import React from 'react';
import {Navigation} from 'react-native-navigation';
import {FTRumViewTracking} from '@cloudcare/react-native-mobile';

/** RUM collection for react-native-navigation. */
export class FTRumReactNativeNavigationTracking {
  private static tracker = new FTRumViewTracking();
  private static listeners = new Map<string, {remove(): void}>();
  private static appearance = 0;
  private static originalCreateElement?: typeof React.createElement;

  static startTracking(): void {
    if (this.originalCreateElement) return;
    this.tracker.start();
    const original = React.createElement;
    this.originalCreateElement = original;
    React.createElement = (
      element: any,
      props: any,
      ...children: any[]
    ): any => {
      const key = props?.componentId;
      if (key && !this.listeners.has(key)) {
        let generation: number | undefined;
        let appearance: number | undefined;
        const listener = Navigation.events().registerComponentListener(
          {
            componentWillAppear: event => {
              appearance = ++this.appearance;
              this.tracker.setCurrent({key, name: event.componentName});
              this.tracker.beginLoad(key);
            },
            componentDidAppear: event => {
              if (appearance !== undefined && appearance !== this.appearance)
                return;
              generation = this.tracker.show({key, name: event.componentName});
            },
            componentDidDisappear: () => {
              // Foreground recovery creates a new generation. The disappearance
              // from an old appearance cannot close that recovered View.
              this.tracker.hide(key, generation);
            },
          },
          key,
        );
        this.listeners.set(key, listener);
      }
      return original(element, props, ...children);
    };
  }

  static stopTracking(): void {
    if (!this.originalCreateElement) return;
    React.createElement = this.originalCreateElement;
    this.originalCreateElement = undefined;
    this.listeners.forEach(listener => listener.remove());
    this.listeners.clear();
    this.tracker.stop();
  }
}
