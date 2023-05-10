import { NativeModules } from 'react-native';

/**
 * 环境。
 */
export enum EnvType {
  prod, gray, pre, common, local 
};
/**
 * 配置启动 SDK 参数。
 * @param serverUrl 数据上报地址
 * @param debug 设置是否允许打印日志，默认false
 * @param datakitUUID 请求HTTP请求头X-Datakit-UUID 数据采集端  如果用户不设置会自动配置
 * @param envType 环境，默认prod
 * @param service 设置所属业务或服务的名称 默认：`df_rum_ios`、`df_rum_android`
 * @param globalContext 自定义全局参数
 * @param groupIdentifiers iOS 端设置采集的 Widget Extension 对应的 AppGroups Identifier 数组
 */
 export interface FTMobileConfig {
   serverUrl: string,
   debug?:boolean,
   datakitUUID?:string,
   envType?:EnvType,
   service?:string,
   globalContext?:object,
   groupIdentifiers?:Array<string>
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
   * 同步 ios Widget Extension 中的事件，仅支持 iOS
   * @param groupIdentifier app groupId
   * @returns {groupIdentifier:string,datas:Array<object>} 可以用于查看 Extension 中采集到的数据. 
   */
   trackEventFromExtension(identifier:string): Promise<object>
 };

 class FTMobileReactNativeWrapper implements FTMobileReactNativeType {
   private sdk:FTMobileReactNativeType = NativeModules.FTMobileReactNative;
   sdkConfig(config:FTMobileConfig): Promise<void> {
     return this.sdk.sdkConfig(config);
   }
   bindRUMUserData(userId: string,userName?:string,userEmail?:string,extra?:object): Promise<void> {
     return this.sdk.bindRUMUserData(userId,userName,userEmail,extra);
   }
   unbindRUMUserData(): Promise<void> {
     return this.sdk.unbindRUMUserData();
   }
   trackEventFromExtension(identifier:string) :Promise<object>{
     return this.sdk.trackEventFromExtension(identifier);
   }
 }
export const FTMobileReactNative: FTMobileReactNativeType = new FTMobileReactNativeWrapper();

