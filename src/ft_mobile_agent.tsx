import { NativeModules } from 'react-native';
import { version as sdkVersion } from './version'

/**
 * 环境。
 */
export enum EnvType {
  prod, gray, pre, common, local
};
export enum FTDBCacheDiscard { discard, discardOldest };
/**
 * 配置启动 SDK 参数。
 * @param serverUrl 数据上报地址，已废弃，使用 [datakitUrl] 替换
 * @param datakitUrl datakit 访问 URL 地址，例子：http://10.0.0.1:9529，端口默认 9529。 datakit 与 dataway 配置二选一
 * @param datawayUrl dataway 访问 URL 地址，例子：http://10.0.0.1:9528，端口默认 9528，注意：安装 SDK 设备需能访问这地址.注意：datakit 和 dataway 配置两者二选一
 * @param clientToken dataway 认证 token，需要与 [datawayUrl] 同时配置
 * @param debug 设置是否允许打印日志，默认false
 * @param env 环境，默认prod
 * @param service 设置所属业务或服务的名称 默认：`df_rum_ios`、`df_rum_android`
 * @param autoSync 数据是否进行自动同步上传 默认：true
 * @param syncPageSize 数据同步时每条请求同步条数,最小值 5 默认：10
 * @param syncSleepTime 数据同步时每条请求间隔时间 单位毫秒 0< syncSleepTime <100
 * @param enableDataIntegerCompatible 数据同步时是否开启数据整数兼容
 * @param compressIntakeRequests 是否对同步数据进行压缩
 * @param globalContext 自定义全局参数
 * @param groupIdentifiers iOS 端设置采集的 Widget Extension 对应的 AppGroups Identifier 数组
 * @param enableLimitWithDbSize 设置是否开启使用 db 限制数据大小，开启后 `FTLogConfig.logCacheLimitCount` 与 `FTRUMConfig.rumCacheLimitCount` 将不再起效
 * @param dbCacheLimit db 缓存限制大小,最小值 30MB ,默认 100MB ,单位 byte
 * @param dbDiscardStrategy db 数据废弃策略
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
 }


type FTMobileReactNativeType = {

  /**
   * SDK 初始化方法。
   * @param config sdk初始化配置项。
   * @returns a Promise.
   */
   sdkConfig(config:FTMobileConfig): Promise<void>;
  /**
   * 绑定用户。
   * @param userId 用户ID。
   * @param userName 用户姓名。
   * @param userEmail 用户邮箱
   * @param extra  用户的额外信息
   * @returns a Promise.
   */
   bindRUMUserData(userId: string,userName?:string,userEmail?:string,extra?:object): Promise<void>;
  /**
   * 解绑用户。
   * @returns a Promise.
   */
   unbindRUMUserData(): Promise<void>;
   /**
   * 添加自定义全局参数。作用于 RUM、Log 数据
   * @param context 自定义全局参数。
   * @returns a Promise.
   */
   appendGlobalContext(context:object):Promise<void>;
   /**
   * 添加自定义 RUM 全局参数。作用于 RUM 数据
   * @param context 自定义 RUM 全局参数。
   * @returns a Promise.
   */
   appendRUMGlobalContext(context:object):Promise<void>;
  /**
   * 添加自定义 RUM、Log 全局参数。作用于 Log 数据
   * @param context 自定义 Log 全局参数。
   * @returns a Promise.
   */
   appendLogGlobalContext(context:object):Promise<void>;
   /**
    * 主动同步数据，当配置 `FTMobileConfig.autoSync=false` 时,需要主动触发本方法，进行数据同步。
    * @returns a Promise.
   */
   flushSyncData():Promise<void>;

   /**
   * 同步 ios Widget Extension 中的事件，仅支持 iOS
   * @param groupIdentifier app groupId
   * @returns {groupIdentifier:string,datas:Array<object>} 可以用于查看 Extension 中采集到的数据.
   */
   trackEventFromExtension(identifier:string): Promise<object>
   /**
    * 关闭 SDK 内正在运行对象
   */
   shutDown():Promise<void>
   /**
    * 清除所有尚未上传至服务器的数据。
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

