/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /**
   * Set RUM tracking conditions and enable RUM collection.
   * @param config rum configuration parameters.
   * @returns a Promise.
   */
  setConfig(config: Object): Promise<void>;
  /**
   * Start RUM Action.
   * RUM will bind Resource, Error, LongTask events that may be triggered by this Action.
   * Avoid adding multiple times within 0.1s, only one Action will be associated with the same View at the same time, and new Actions will be discarded if the previous one has not ended.
   * Adding Action with `addAction` method does not affect each other.
   * @param actionName action name
   * @param actionType action type
   * @param property event context (optional)
   * @returns a Promise.
   */
  startAction(
    actionName: string,
    actionType: string,
    property?: Object
  ): Promise<void>;
  /**
   * Add Action event. This type of data cannot be associated with Error, Resource, LongTask data, and has no discard logic.
   * @param actionName action name
   * @param actionType action type
   * @param property event context (optional)
   * @returns a Promise.
   */
  addAction(
    actionName: string,
    actionType: string,
    property?: Object
  ): Promise<void>;
  /**
   * view load duration.
   * @param viewName view name
   * @param loadTime view load duration
   * @returns a Promise.
   */
  onCreateView(viewName: string, loadTime: number): Promise<void>;
  /**
   * view start.
   * @param viewName page name
   * @param property event context (optional)
   * @returns a Promise.
   */
  startView(viewName: string, property?: Object): Promise<void>;
  /**
   * view end.
   * @param property event context (optional)
   * @returns a Promise.
   */
  stopView(property?: Object): Promise<void>;
  /**
   * Exception capture and log collection.
   * @param stack stack log
   * @param message error message
   * @param property event context (optional)
   * @returns a Promise.
   */
  addError(stack: string, message: string, property?: Object): Promise<void>;
  /**
   * Exception capture and log collection.
   * @param type error type
   * @param stack stack log
   * @param message error message
   * @param property event context (optional)
   * @returns a Promise.
   */
  addErrorWithType(
    type: string,
    stack: string,
    message: string,
    property?: Object
  ): Promise<void>;
  /**
   * Start resource request.
   * @param key unique id
   * @param property event context (optional)
   * @returns a Promise.
   */
  startResource(key: string, property?: Object): Promise<void>;
  /**
   * End resource request.
   * @param key unique id
   * @param property event context (optional)
   * @returns a Promise.
   */
  stopResource(key: string, property?: Object): Promise<void>;
  /**
   * Send resource data metrics.
   * @param key unique id
   * @param resource resource data
   * @param metrics resource performance data
   * @returns a Promise.
   */
  addResource(key: string, resource: Object, metrics?: Object): Promise<void>;
}
export default TurboModuleRegistry.get<Spec>('FTReactNativeRUM');
