/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /**
   * Set Session Replay configuration and enable session replay
   * @param config Session Replay configuration parameters.
   * @returns a Promise.
   */
  sessionReplayConfig(config: Object): Promise<void>;
}
export default TurboModuleRegistry.get<Spec>('FTReactNativeSessionReplay');
