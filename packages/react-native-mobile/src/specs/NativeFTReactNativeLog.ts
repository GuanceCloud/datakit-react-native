/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /**
   *Configure log output configuration to enable log collection.
   */
  logConfig(config: Object): Promise<void>;
  /**
   * Output log.
   * @param content log content
   * @param status log status
   * @param property log context (optional)
   */
  logging(content: string, logStatus: number, property?: Object): Promise<void>;
  /**
   * Output log.
   * @param content log content
   * @param status log status
   * @param property log context (optional)
   */
  logWithStatusString(
    content: string,
    logStatus: string,
    property?: Object
  ): Promise<void>;
}
export default TurboModuleRegistry.get<Spec>('FTReactNativeLog');
