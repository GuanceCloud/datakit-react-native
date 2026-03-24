import { NativeModules } from 'react-native';
import { version as sdkVersion } from './version'

/**
 * Bridge context manager for managing shared properties across RUM and Logger modules
 * This class provides a centralized way to store and retrieve global properties that will be
 * automatically merged with local properties when making calls to RUM and Logger functions
 */
class BridgeContextManager {
  private static instance: BridgeContextManager;
  private properties: Map<string, any> = new Map();
  private sdk: FTMobileReactNativeType = NativeModules.FTMobileReactNative;

  private constructor() {
    // Initialize with SDK version information
    this.initializeSDKInfo();
  }

  /**
   * Initialize SDK information properties
   * @private
   */
  private initializeSDKInfo(): void {
    // Create sdk_bridge_info with version information
    const sdkBridgeInfo = {
      'react_native': sdkVersion
    };

    // Set the sdk_bridge_info property
    this.properties.set('sdk_bridge_info', JSON.stringify(sdkBridgeInfo));
  }

  /**
   * Get singleton instance of BridgeContextManager
   * @returns BridgeContextManager instance
   */
  public static getInstance(): BridgeContextManager {
    if (!BridgeContextManager.instance) {
      BridgeContextManager.instance = new BridgeContextManager();
    }
    return BridgeContextManager.instance;
  }

  /**
   * Add bridge context properties that will be automatically merged with local properties
   * @param properties Object containing key-value pairs
   */
  public async appendBridgeContext(properties: Record<string, any>): Promise<void> {
    // Store properties locally in JavaScript
    Object.entries(properties).forEach(([key, value]) => {
      this.properties.set(key, value);
    });

    // Also send to native SDK
    return this.sdk.appendBridgeContext(properties);
  }

  /**
   * Synchronous version of appendBridgeContext for backward compatibility
   * Note: This method stores properties locally and calls native SDK asynchronously
   * @param properties Object containing key-value pairs
   */
  public appendBridgeContextSync(properties: Record<string, any>): void {
    // Store properties locally in JavaScript
    Object.entries(properties).forEach(([key, value]) => {
      this.properties.set(key, value);
    });

    // Fire and forget - call async method without waiting
    this.sdk.appendBridgeContext(properties).catch(error => {
      console.warn('Failed to append bridge context:', error);
    });
  }

  /**
   * Merge bridge context properties with local properties
   * Bridge context properties take precedence over local properties
   * @param localProperties Local properties to merge with bridge context properties
   * @returns Merged properties object
   */
  public mergeWithLocalPropertiesSync(localProperties?: object): Record<string, any> {
    const merged: Record<string, any> = {};

    // First add local properties (if any)
    if (localProperties) {
      Object.assign(merged, localProperties);
    }

    // Then add bridge context properties (these will override local properties with same keys)
    this.properties.forEach((value, key) => {
      merged[key] = value;
    });

    return merged;
  }
}

// Internal bridge context manager - not exported
export const bridgeContextManager = BridgeContextManager.getInstance();

/**
 * Environment.
 */
export enum EnvType {
  prod, gray, pre, common, local
};
export enum FTDBCacheDiscard { discard, discardOldest };
/**
 * Configure SDK startup parameters.
 * @param serverUrl data reporting address, deprecated, use [datakitUrl] instead
 * @param datakitUrl datakit access URL address, example: http://10.0.0.1:9529, default port 9529. Choose one between datakit and dataway configuration
 * @param datawayUrl dataway access URL address, example: http://10.0.0.1:9528, default port 9528, note: the device installing the SDK needs to be able to access this address. Note: choose one between datakit and dataway configuration
 * @param clientToken dataway authentication token, needs to be configured together with [datawayUrl]
 * @param debug set whether to allow log printing, default false
 * @param env environment, default prod
 * @param service set the name of the business or service it belongs to, default: `df_rum_ios`, `df_rum_android`
 * @param autoSync whether data is automatically synchronized and uploaded, default: true
 * @param syncPageSize number of synchronized items per request during data synchronization, minimum value 5, default: 10
 * @param syncSleepTime interval time between each request during data synchronization, unit milliseconds, 0 < syncSleepTime < 100
 * @param enableDataIntegerCompatible whether to enable data integer compatibility during data synchronization, enabled by default
 * @param compressIntakeRequests whether to compress synchronized data
 * @param globalContext custom global parameters
 * @param groupIdentifiers iOS side sets the AppGroups Identifier array corresponding to the collected Widget Extension
 * @param enableLimitWithDbSize set whether to enable using db to limit data size, after enabling, `FTLogConfig.logCacheLimitCount` and `FTRUMConfig.rumCacheLimitCount` will no longer take effect
 * @param dbCacheLimit db cache limit size, minimum value 30MB, default 100MB, unit byte
 * @param dbDiscardStrategy db data discard strategy
 * @param dataModifier data modifier, modify individual fields {key:value}, after setting, the SDK will replace the original value with the set value according to the key
 * @param lineDataModifier data modifier, modify single data {"measurement":measurement,"data":{key:value}}, after setting, the SDK will replace the original value with the set value according to the key
 * @param remoteConfiguration Set whether to enable remote dynamic configuration
 * @param remoteConfigMiniUpdateInterval Set remote dynamic configuration minimum update interval, unit seconds, default 12*60*60
*/
 export interface FTMobileConfig {
   /**
    * @deprecated "serverUrl" parameter renamed to "datakitUrl"
    */
   serverUrl?: string,
   datakitUrl?: string,
   datawayUrl?: string,
   clientToken?: string,
   debug?:boolean,
   envType?:EnvType,
   env?:string,
   service?:string,
   autoSync?:boolean,
   syncPageSize?:number,
   syncSleepTime?:number,
   enableDataIntegerCompatible?:boolean,
   compressIntakeRequests?:boolean,
   globalContext?:object,
   groupIdentifiers?:Array<string>,
   enableLimitWithDbSize?:boolean,
   dbCacheLimit?:number,
   dbDiscardStrategy?:FTDBCacheDiscard,
   dataModifier?:object,
   lineDataModifier?:object,
   remoteConfiguration?:boolean,
   remoteConfigMiniUpdateInterval?:number,
 }


type FTMobileReactNativeType = {

  /**
   * SDK initialization method.
   * @param config SDK initialization configuration items.
   * @returns a Promise.
   */
   sdkConfig(config:FTMobileConfig): Promise<void>;
  /**
   * Bind user.
   * @param userId user ID.
   * @param userName user name.
   * @param userEmail user email
   * @param extra additional user information
   * @returns a Promise.
   */
   bindRUMUserData(userId: string,userName?:string,userEmail?:string,extra?:object): Promise<void>;
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
   appendGlobalContext(context:object):Promise<void>;
   /**
   * Add custom RUM global parameters. Applies to RUM data
   * @param context custom RUM global parameters.
   * @returns a Promise.
   */
   appendRUMGlobalContext(context:object):Promise<void>;
  /**
   * Add custom RUM and Log global parameters. Applies to Log data
   * @param context custom Log global parameters.
   * @returns a Promise.
   */
   appendLogGlobalContext(context:object):Promise<void>;
   /**
    * Actively synchronize data. When `FTMobileConfig.autoSync=false` is configured, you need to actively trigger this method to synchronize data.
    * @returns a Promise.
   */
   flushSyncData():Promise<void>;

   /**
   * Synchronize events in iOS Widget Extension, iOS only
   * @param groupIdentifier app groupId
   * @returns {groupIdentifier:string,datas:Array<object>} can be used to view data collected in Extension.
   */
   trackEventFromExtension(identifier:string): Promise<object>
   /**
    * Shut down objects currently running in the SDK
    */
   shutDown():Promise<void>
   /**
    * Clear all data that has not yet been uploaded to the server.
    */
   clearAllData():Promise<void>
   /**
    * Add bridge context properties that will be automatically merged with local properties
    * @param properties Object containing key-value pairs
    */
   appendBridgeContext(properties: Record<string, any>): Promise<void>;
   /**
    * Update remote configuration, after enabling remote configuration, you can call this method to update the configuration in real time.
    */
   updateRemoteConfig():Promise<void>
   /**
    * Update remote configuration with minimum update interval, after enabling remote configuration, you can call this method to update the configuration in real time.
    * This method is used to set the minimum update interval for remote configuration updates. 
    * If the time since the last update is less than the specified interval, the update will not be performed.
    * @param interval minimum update interval, unit seconds
   */
   updateRemoteConfigWithMiniUpdateInterval(interval:number):Promise<void>
 };

 class FTMobileReactNativeWrapper implements FTMobileReactNativeType {
   private sdk:FTMobileReactNativeType = NativeModules.FTMobileReactNative;

   sdkConfig(config:FTMobileConfig): Promise<void> {
     if(config.serverUrl != null && config.serverUrl.length>0 && config.datakitUrl == null){
       config.datakitUrl = config.serverUrl;
     }
     return this.sdk.sdkConfig(config);
   }
   bindRUMUserData(userId: string,userName?:string,userEmail?:string,extra?:object): Promise<void> {
     return this.sdk.bindRUMUserData(userId,userName,userEmail,extra);
   }
   unbindRUMUserData(): Promise<void> {
     return this.sdk.unbindRUMUserData();
   }
   appendGlobalContext(context: object): Promise<void> {
    return this.sdk.appendGlobalContext(context);
   }
   appendLogGlobalContext(context: object): Promise<void> {
       return this.sdk.appendLogGlobalContext(context);
   }
   appendRUMGlobalContext(context: object): Promise<void> {
       return this.sdk.appendRUMGlobalContext(context);
   }
   trackEventFromExtension(identifier:string) :Promise<object>{
     return this.sdk.trackEventFromExtension(identifier);
   }
   flushSyncData():Promise<void>{
    return this.sdk.flushSyncData();
   }
   shutDown():Promise<void>{
    return this.sdk.shutDown();
   }
   clearAllData():Promise<void>{
    return this.sdk.clearAllData();
   }
   appendBridgeContext(properties: Record<string, any>): Promise<void> {
     // Use bridgeContextManager to store properties in JavaScript and send to native SDK
     return bridgeContextManager.appendBridgeContext(properties);
  }
   updateRemoteConfig():Promise<void>{
    return this.sdk.updateRemoteConfig();
   }
   updateRemoteConfigWithMiniUpdateInterval(interval:number):Promise<void>{
      return this.sdk.updateRemoteConfigWithMiniUpdateInterval(interval);
    }
 }
export const FTMobileReactNative: FTMobileReactNativeType = new FTMobileReactNativeWrapper();

