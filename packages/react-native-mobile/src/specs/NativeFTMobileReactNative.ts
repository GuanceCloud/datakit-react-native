/* eslint-disable @typescript-eslint/ban-types */
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /**
   * SDK initialization method.
   * @param config SDK initialization configuration items.
   * @returns a Promise.
   */
  sdkConfig(config: Object): Promise<void>;
  /**
   * Dynamically set the Datakit upload URL after SDK initialization.
   * @param datakitUrl Datakit upload URL.
   * @returns a Promise.
   */
  setDatakitURL(datakitUrl: string): Promise<void>;
  /**
   * Dynamically set the Dataway upload URL and client token after SDK initialization.
   * @param datawayUrl Dataway upload URL.
   * @param clientToken Dataway authentication token.
   * @returns a Promise.
   */
  setDatawayURL(datawayUrl: string, clientToken: string): Promise<void>;
  /**
   * Bind user.
   * @param userId user ID.
   * @param userName user name.
   * @param userEmail user email
   * @param extra additional user information
   * @returns a Promise.
   */
  bindRUMUserData(
    userId: string,
    userName?: string,
    userEmail?: string,
    extra?: Object
  ): Promise<void>;
  /**
   * Unbind user.
   * @returns a Promise.
   */
  unbindRUMUserData(): Promise<void>;
  /**
   * Add custom global parameters. Applies to RUM and Log data
   * @param context custom global parameters.
   * @returns a Promise.
   */
  appendGlobalContext(context: Object): Promise<void>;
  /**
   * Add custom RUM global parameters. Applies to RUM data
   * @param context custom RUM global parameters.
   * @returns a Promise.
   */
  appendRUMGlobalContext(context: Object): Promise<void>;
  /**
   * Add custom RUM and Log global parameters. Applies to Log data
   * @param context custom Log global parameters.
   * @returns a Promise.
   */
  appendLogGlobalContext(context: Object): Promise<void>;
  /**
   * Actively synchronize data. When `FTMobileConfig.autoSync=false` is configured, you need to actively trigger this method to synchronize data.
   * @returns a Promise.
   */
  flushSyncData(): Promise<void>;

  /**
   * Synchronize events in iOS Widget Extension, iOS only
   * @param groupIdentifier app groupId
   * @returns {groupIdentifier:string,datas:Array<Object>} can be used to view data collected in Extension.
   */
  trackEventFromExtension(identifier: string): Promise<Object>;
  /**
   * Shut down objects currently running in the SDK
   */
  shutDown(): Promise<void>;
  /**
   * Clear all data that has not yet been uploaded to the server.
   */
  clearAllData(): Promise<void>;
}
export default TurboModuleRegistry.get<Spec>('FTMobileReactNative');
