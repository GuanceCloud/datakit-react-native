import { NativeModules } from 'react-native';
import { version as sdkVersion } from './version'

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
   pkgInfo?: string,
   dataModifier?:object,
   lineDataModifier?:object
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
 };

 class FTMobileReactNativeWrapper implements FTMobileReactNativeType {
   private sdk:FTMobileReactNativeType = NativeModules.FTMobileReactNative;
   sdkConfig(config:FTMobileConfig): Promise<void> {
     if(config.serverUrl != null && config.serverUrl.length>0 && config.datakitUrl == null){
       config.datakitUrl = config.serverUrl;
     }
     config.pkgInfo = sdkVersion;
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
 }
export const FTMobileReactNative: FTMobileReactNativeType = new FTMobileReactNativeWrapper();

