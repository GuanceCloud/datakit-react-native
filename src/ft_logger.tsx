import { NativeModules } from 'react-native';
/**
 * 设置日志等级。
 */
 export enum FTLogStatus {
   info, warning, error, critical, ok,
 };
/**
 * 日志丢弃方式。
 */
 export enum FTLogCacheDiscard { discard, discardOldest };
/**
 * 配置日志输出配置。
 * @param sampleRate 采样率
 * @param serviceName 服务名
 * @param enableLinkRumData 是否与 RUM 关联
 * @param enableCustomLog 是否开启自定义日志
 * @param discardStrategy 日志丢弃策略
 * @param logLevelFilters 日志等级过滤
 * @param globalContext 自定义全局参数
 */
 export interface FTLogConfig{
   sampleRate?: number,
   serviceName?: string ,
   enableLinkRumData?: boolean,
   enableCustomLog?: boolean, 
   discardStrategy?: FTLogCacheDiscard,
   logLevelFilters?: Array<FTLogStatus>,
   globalContext?:object,
 };

 type FTReactNativeLogType = {
  /**
   *配置日志输出配置 开启日志采集。
   */
   logConfig(config: FTLogConfig): Promise<void>;
  /**
   * 输出日志。
   * @param content 日志内容
   * @param status  日志状态
   */
   logging(content:String,logStatus:FTLogStatus): Promise<void>;
 };

 class FTReactNativeLogWrapper implements FTReactNativeLogType {
   private logger: FTReactNativeLogType = NativeModules.FTReactNativeLog;

   logConfig(config:FTLogConfig): Promise<void>{
     return this.logger.logConfig(config);
   }

   logging(content:String,logStatus:FTLogStatus): Promise<void>{
     return this.logger.logging(content,logStatus);
   }
 }
 export const FTReactNativeLog: FTReactNativeLogType = new FTReactNativeLogWrapper();
 