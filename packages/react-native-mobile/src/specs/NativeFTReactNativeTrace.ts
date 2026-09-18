/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /**
   * Configure trace to enable distributed tracing.
   * @param config trace configuration parameters.
   * @returns a Promise.
   */
  setConfig(config: Object): Promise<void>;
  /**
   * Get trace HTTP request header data.
   * @param url request URL
   * @returns trace request header parameters
   * @deprecated use getTraceHeaderFields() replace.
   */
  getTraceHeader(key: string, url: string): Promise<Object>;
  /**
   * Get trace HTTP request header data.
   * @param url request URL
   * @returns trace request header parameters
   */
  getTraceHeaderFields(url: string, key?: string): Promise<Object>;
  /**
   * Get trace HTTP request headers synchronously for APIs whose construction
   * cannot wait for a Promise, such as React Native WebSocket.
   * @internal
   */
  getTraceHeaderFieldsSync(url: string, key: string): Object | null;
  /**
   * Discard iOS Trace correlation when WebSocket observation is abandoned
   * before Resource reporting starts. Android uses native collection.
   * @internal
   */
  cancelWebSocketTrace(key: string): Promise<void>;
}
export default TurboModuleRegistry.get<Spec>('FTReactNativeTrace');
