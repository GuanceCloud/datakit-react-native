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
 * @param useOAID 是否使用 OAID 唯一识别，默认false,开启后替换 deviceUUID 进行使用
 * @param debug 设置是否允许打印日志，默认false
 * @param datakitUUID 请求HTTP请求头X-Datakit-UUID 数据采集端  如果用户不设置会自动配置
 * @param envType 环境，默认prod
 * @param globalContext 自定义全局参数
 */
 export interface FTMobileConfig {
   serverUrl: string,
   useOAID?: string,
   debug?:boolean,
   datakitUUID?:string,
   envType?:EnvType,
   globalContext?:object,
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
   * @returns a Promise.
   */
   bindRUMUserData(userId: string): Promise<void>; 
  /**
   * 解绑用户。
   * @returns a Promise.
   */
   unbindRUMUserData(): Promise<void>;
 };

 class FTMobileReactNativeWrapper implements FTMobileReactNativeType {
   private sdk:FTMobileReactNativeType = NativeModules.FTMobileReactNative;
   sdkConfig(config:FTMobileConfig): Promise<void> {
     return this.sdk.sdkConfig(config);
   }
   bindRUMUserData(userId: string): Promise<void> {
     return this.sdk.bindRUMUserData(userId);
   }
   unbindRUMUserData(): Promise<void> {
     return this.sdk.unbindRUMUserData();
   }
 }
export const FTMobileReactNative: FTMobileReactNativeType = new FTMobileReactNativeWrapper();

