import {
  EmitterSubscription,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';
import { version as sdkVersion } from './version';

/**
 * Bridge context manager for managing shared properties across RUM and Logger modules
 * This class provides a centralized way to store and retrieve global properties that will be
 * automatically merged with local properties when making calls to RUM and Logger functions
 */
class BridgeContextManager {
  private static instance: BridgeContextManager;
  private properties: Map<string, any> = new Map();

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
      react_native: sdkVersion,
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
  public appendBridgeContext(properties: Record<string, any>): void {
    // Store properties locally in JavaScript
    try {
      // Store properties locally in JavaScript
      Object.entries(properties).forEach(([key, value]) => {
        this.properties.set(key, value);
      });
    } catch (error) {
      console.warn('Failed to append bridge context:', error);
    }
  }

  /**
   * Merge bridge context properties with local properties
   * Bridge context properties take precedence over local properties
   * @param localProperties Local properties to merge with bridge context properties
   * @returns Merged properties object
   */
  public mergeWithLocalPropertiesSync(
    localProperties?: object
  ): Record<string, any> {
    try {
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
    } catch (error) {
      console.warn(
        'Failed to merge bridge context with local properties:',
        error
      );
      // Return empty object or only local properties on error
      return localProperties ? { ...localProperties } : {};
    }
  }
}

// Internal bridge context manager - not exported
export const bridgeContextManager = BridgeContextManager.getInstance();

/**
 * Environment.
 */
export enum EnvType {
  prod,
  gray,
  pre,
  common,
  local,
}
export enum FTDBCacheDiscard {
  discard,
  discardOldest,
}

/**
 * Remote config override rule matching condition for custom keys. Supports exact match and contains match.
 * For exact match, set the value directly, for example: "userid": "test_user", which means the rule will be applied when the custom key "userid" is exactly "test_user".
 * For contains match, set the value as an object with a "contains" field, for example: "userid": { "contains": "test_user" }, which means the rule will be applied when the custom key "userid" contains the object "test_user".
 */
export type FTRemoteConfigCustomKeyContainsMatch = {
  contains: string | number | boolean;
};

/**
 * Matching rules for remote config override
 * Defines matching conditions using customKeys
 */
export type FTRemoteConfigOverrideMatch = {
  customKeys?: Record<
    string,
    string | number | boolean | FTRemoteConfigCustomKeyContainsMatch
  >;
};

/**
 * Values that can be modified by remote config override rules.
 * These values will adjust the fetched remote configuration before it is applied.
 */
export type FTRemoteConfigOverrideValues = {
  env?: string;
  serviceName?: string;
  autoSync?: boolean;
  compressIntakeRequests?: boolean;
  syncPageSize?: number;
  syncSleepTime?: number;
  rumSampleRate?: number;
  rumSessionOnErrorSampleRate?: number;
  rumEnableTraceUserAction?: boolean;
  rumEnableTraceUserView?: boolean;
  rumEnableTraceUserResource?: boolean;
  rumEnableResourceHostIP?: boolean;
  rumEnableTrackAppUIBlock?: boolean;
  rumBlockDurationMs?: number;
  rumEnableTrackAppCrash?: boolean;
  rumEnableTrackAppANR?: boolean;
  rumEnableTraceWebView?: boolean;
  rumAllowWebViewHost?: Array<string>;
  traceSampleRate?: number;
  traceEnableAutoTrace?: boolean;
  traceType?: string;
  logSampleRate?: number;
  logLevelFilters?: Array<string>;
  logEnableCustomLog?: boolean;
  logEnableConsoleLog?: boolean;
};

/**
 * Remote config override rules .
 * Adjust the fetched remote configuration before application.
 */
export type FTRemoteConfigOverrideRule = {
  id?: string;
  enabled?: boolean;
  match: FTRemoteConfigOverrideMatch;
  override: FTRemoteConfigOverrideValues;
};
/**
 * Final result of the remote config update
 * @param triggerType the type of remote config update trigger, auto or manual
 * @param success whether the remote config update was successful
 * @param platform the platform of the device, ios or android
 * @param timestamp the timestamp when the remote config update was triggered
 * @param rawJson the final remote config update result, in JSON string format
 * @param errorCode the error code if the remote config update failed, may be null if the update was successful
 * @param errorMessage the error message if the remote config update failed, may be null if the update was successful
 * @param appliedOverrideRuleIds the list of override rule IDs applied in this remote config update, may be null if no rules were applied
 */
export type FTRemoteConfigResult = {
  triggerType: 'auto' | 'manual';
  success: boolean;
  platform: 'ios' | 'android';
  timestamp: number;
  rawJson?: string;
  errorCode?: string | number;
  errorMessage?: string;
  appliedOverrideRuleIds?: string[];
};
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
 * @param enableDataFilter whether to enable SDK-side local data filters, enabled by default
 * @param dataFilters local blocklist filter rules. Supported categories include `logging` and `rum`. Any data that matches a rule will be discarded.
 * @param globalContext custom global parameters
 * @param groupIdentifiers iOS side sets the AppGroups Identifier array corresponding to the collected Widget Extension
 * @param enableLimitWithDbSize set whether to enable using db to limit data size, after enabling, `FTLogConfig.logCacheLimitCount` and `FTRUMConfig.rumCacheLimitCount` will no longer take effect
 * @param dbCacheLimit db cache limit size, minimum value 30MB, default 100MB, unit byte
 * @param dbDiscardStrategy db data discard strategy
 * @param dataModifier data modifier, modify individual fields {key:value}, after setting, the SDK will replace the original value with the set value according to the key
 * @param lineDataModifier data modifier, modify single data {"measurement":measurement,"data":{key:value}}, after setting, the SDK will replace the original value with the set value according to the key
 * @param remoteConfiguration Set whether to enable remote dynamic configuration
 * @param remoteConfigMiniUpdateInterval Set remote dynamic configuration minimum update interval, unit seconds, default 12*60*60
 * @param remoteConfigOverrideRules Remote config override rules .Adjust the fetched remote configuration before application.
 */
export interface FTMobileConfig {
  /**
   * @deprecated "serverUrl" parameter renamed to "datakitUrl"
   */
  serverUrl?: string;
  datakitUrl?: string;
  datawayUrl?: string;
  clientToken?: string;
  debug?: boolean;
  envType?: EnvType;
  env?: string;
  service?: string;
  autoSync?: boolean;
  syncPageSize?: number;
  syncSleepTime?: number;
  enableDataIntegerCompatible?: boolean;
  compressIntakeRequests?: boolean;
  enableDataFilter?: boolean;
  dataFilters?: Record<string, Array<string>>;
  globalContext?: object;
  groupIdentifiers?: Array<string>;
  enableLimitWithDbSize?: boolean;
  dbCacheLimit?: number;
  dbDiscardStrategy?: FTDBCacheDiscard;
  dataModifier?: object;
  lineDataModifier?: object;
  remoteConfiguration?: boolean;
  remoteConfigMiniUpdateInterval?: number;
  remoteConfigOverrideRules?: Array<FTRemoteConfigOverrideRule>;
}

type FTMobileReactNativeType = {
  /**
   * SDK initialization method.
   * @param config SDK initialization configuration items.
   * @returns a Promise.
   */
  sdkConfig(config: FTMobileConfig): Promise<void>;
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
    extra?: object
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
  appendGlobalContext(context: object): Promise<void>;
  /**
   * Add custom RUM global parameters. Applies to RUM data
   * @param context custom RUM global parameters.
   * @returns a Promise.
   */
  appendRUMGlobalContext(context: object): Promise<void>;
  /**
   * Add custom RUM and Log global parameters. Applies to Log data
   * @param context custom Log global parameters.
   * @returns a Promise.
   */
  appendLogGlobalContext(context: object): Promise<void>;
  /**
   * Actively synchronize data. When `FTMobileConfig.autoSync=false` is configured, you need to actively trigger this method to synchronize data.
   * @returns a Promise.
   */
  flushSyncData(): Promise<void>;

  /**
   * Synchronize events in iOS Widget Extension, iOS only
   * @param groupIdentifier app groupId
   * @returns {groupIdentifier:string,datas:Array<object>} can be used to view data collected in Extension.
   */
  trackEventFromExtension(identifier: string): Promise<object>;
  /**
   * Shut down objects currently running in the SDK
   */
  shutDown(): Promise<void>;
  /**
   * Clear all data that has not yet been uploaded to the server.
   */
  clearAllData(): Promise<void>;
  /**
   * Add bridge context properties that will be automatically merged with local properties
   * @param properties Object containing key-value pairs
   */
  appendBridgeContext(properties: Record<string, any>): void;
  /**
   * Update remote configuration, after enabling remote configuration, you can call this method to update the configuration in real time.
   */
  updateRemoteConfig(): Promise<FTRemoteConfigResult>;
  /**
   * Update remote configuration with minimum update interval, after enabling remote configuration, you can call this method to update the configuration in real time.
   * This method is used to set the minimum update interval for remote configuration updates. If the time since the last update is less than the specified interval, the update will not be performed.
   * @param interval minimum update interval, unit seconds
   * @param rules Remote config override rules .Adjust the fetched remote configuration before application.
   * @returns the result of the remote config update
   */
  updateRemoteConfigWithMiniUpdateInterval(
    interval: number,
    rules?: Array<FTRemoteConfigOverrideRule>
  ): Promise<FTRemoteConfigResult>;
  /**
   * Listen for auto remote configuration updates triggered by the native SDK.
   * Manual updates are returned through the update Promise instead of this event.
   */
  addRemoteConfigListener(
    listener: (result: FTRemoteConfigResult) => void
  ): EmitterSubscription;
};

class FTMobileReactNativeWrapper implements FTMobileReactNativeType {
  /* eslint-disable @typescript-eslint/no-var-requires */
  private sdk: FTMobileReactNativeType =
    require('./specs/NativeFTMobileReactNative').default;
  /* eslint-enable @typescript-eslint/no-var-requires */

  private emitter: NativeEventEmitter | null = null;

  private getEmitter(): NativeEventEmitter {
    if (this.emitter) {
      return this.emitter;
    }

    const nativeEventModule = NativeModules.FTMobileReactNative ?? this.sdk;
    this.emitter = new NativeEventEmitter(nativeEventModule as never);
    return this.emitter;
  }

  sdkConfig(config: FTMobileConfig): Promise<void> {
    if (
      config.serverUrl != null &&
      config.serverUrl.length > 0 &&
      config.datakitUrl == null
    ) {
      config.datakitUrl = config.serverUrl;
    }
    return this.sdk.sdkConfig(config);
  }
  setDatakitURL(datakitUrl: string): Promise<void> {
    return this.sdk.setDatakitURL(datakitUrl);
  }
  setDatawayURL(datawayUrl: string, clientToken: string): Promise<void> {
    return this.sdk.setDatawayURL(datawayUrl, clientToken);
  }
  bindRUMUserData(
    userId: string,
    userName?: string,
    userEmail?: string,
    extra?: object
  ): Promise<void> {
    return this.sdk.bindRUMUserData(userId, userName, userEmail, extra);
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
  trackEventFromExtension(identifier: string): Promise<object> {
    return this.sdk.trackEventFromExtension(identifier);
  }
  flushSyncData(): Promise<void> {
    return this.sdk.flushSyncData();
  }
  shutDown(): Promise<void> {
    return this.sdk.shutDown();
  }
  clearAllData(): Promise<void> {
    return this.sdk.clearAllData();
  }
  appendBridgeContext(properties: Record<string, any>): void {
    // Use bridgeContextManager to store properties in JavaScript and send to native SDK
    bridgeContextManager.appendBridgeContext(properties);
  }
  updateRemoteConfig(): Promise<FTRemoteConfigResult> {
    return this.sdk.updateRemoteConfig();
  }
  updateRemoteConfigWithMiniUpdateInterval(
    interval: number,
    rules?: Array<FTRemoteConfigOverrideRule>
  ): Promise<FTRemoteConfigResult> {
    return this.sdk.updateRemoteConfigWithMiniUpdateInterval(interval, rules);
  }
  addRemoteConfigListener(
    listener: (result: FTRemoteConfigResult) => void
  ): EmitterSubscription {
    return this.getEmitter().addListener('ft_remote_config_callback', listener);
  }
}
export const FTMobileReactNative: FTMobileReactNativeType =
  new FTMobileReactNativeWrapper();
