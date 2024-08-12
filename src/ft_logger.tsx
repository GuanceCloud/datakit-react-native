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
 * @param enableLinkRumData 是否与 RUM 关联
 * @param enableCustomLog 是否开启自定义日志
 * @param discardStrategy 日志丢弃策略
 * @param logLevelFilters 日志等级过滤
 * @param globalContext 自定义全局参数
 * @param logCacheLimitCount 获取最大日志条目数量限制 [1000,),默认 5000
 */
 export interface FTLogConfig{
   sampleRate?: number,
   enableLinkRumData?: boolean,
   enableCustomLog?: boolean,
   discardStrategy?: FTLogCacheDiscard,
   logLevelFilters?: Array<FTLogStatus>,
   globalContext?:object,
   logCacheLimitCount?: number
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
   * @param property 日志上下文(可选)
   */
   logging(content:String,logStatus:FTLogStatus,property?:object): Promise<void>;
   /**
    * 输出日志。
    * @param content 日志内容
    * @param status  日志状态
    * @param property 日志上下文(可选)
    */
   logWithStatusString(content:String,logStatus:String,property?:object): Promise<void>;
 };

 class FTReactNativeLogWrapper  {
   private logger: FTReactNativeLogType = NativeModules.FTReactNativeLog;
  /**
   *配置日志输出配置 开启日志采集。
   */
   logConfig(config:FTLogConfig): Promise<void>{
     return this.logger.logConfig(config);
   }

   /**
   * 输出日志。
   * @param content 日志内容
   * @param status  日志状态
   * @param property 日志上下文(可选)
   */
   logging(content:String,logStatus:FTLogStatus|String,property?:object): Promise<void>{
     if((typeof logStatus)==='string'){
       return this.logger.logWithStatusString(content,logStatus.toString(),property)
     }
     let enumLogStatus: FTLogStatus = logStatus as FTLogStatus;
     return this.logger.logging(content,enumLogStatus,property);
   }
 }
 export const FTReactNativeLog: FTReactNativeLogWrapper = new FTReactNativeLogWrapper();
