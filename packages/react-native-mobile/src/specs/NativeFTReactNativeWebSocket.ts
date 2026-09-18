/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/** Internal iOS handshake reporting bridge; absent on Android and older binaries. */
export interface Spec extends TurboModule {
  startCapture(session: string): Promise<void>;
  stopCapture(session: string): Promise<void>;
  clear(): Promise<void>;
  startResource(
    key: string,
    socketID: number,
    url: string,
    session: string,
    sequence: number,
    property: Object
  ): Promise<void>;
  stopResource(
    key: string,
    event: string,
    session: string,
    property: Object
  ): Promise<void>;
  addResource(
    key: string,
    content: Object,
    metrics: Object,
    session: string
  ): Promise<void>;
  releaseResource(key: string, session: string): Promise<void>;
}

export default TurboModuleRegistry.get<Spec>('FTReactNativeWebSocket');
