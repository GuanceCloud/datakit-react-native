import { NativeModules } from 'react-native';
import { FTResourceTracking} from './rum/FTResourceTracking';
//FTReactNativeTrace

/**
 * 使用 trace 的类型。
 */
 export enum TraceType {
   ddTrace,
   zipkinMulti,
   zipkinSingle,
   traceparent,
   skywalking,
   jaeger,
 };
/**
 * 配置 trace 。
 * @param sampleRate 采样率
 * @param traceType 链路类型
 * @param enableLinkRUMData 是否与 RUM 数据关联
 * @param enableAutoTrace 是否开启自动追踪 
 * @param enableNativeAutoTrace 是否开启原生网络网络自动追踪 iOS NSURLSession ,Android OKhttp

 */
 export interface FTTraceConfig{
   sampleRate?:number,
   traceType?:TraceType,
   enableLinkRUMData?:boolean,
   enableAutoTrace?:boolean,
   enableNativeAutoTrace?:boolean
 };
/**
 * trace 采集数据
 * @param httpMethod 请求方法
 * @param requestHeader 请求头参数
 * @param statusCode 返回状态码
 * @param responseHeader 返回头参数
 * @param errorMessage 错误消息
 */
 export interface FTTraceResource{
   httpMethod:string,
   requestHeader:object,
   statusCode?:number,
   responseHeader?:object,
   errorMessage?:string
 };
 type FTReactNativeTraceType = {
  /**
   * 配置 trace 开启链路追踪。
   * @param config trace 配置参数。
   * @returns a Promise.
   */
   setConfig(config: FTTraceConfig): Promise<void>; 
  /**
   * 获取 trace http 请求头数据。
   * @param url 请求地址
   * @returns trace 添加的请求头参数  
   */
   getTraceHeader(url: String): Promise<object>;
 };

 class FTReactNativeTraceWrapper implements FTReactNativeTraceType {
   private trace: FTReactNativeTraceType = NativeModules.FTReactNativeTrace;

   setConfig(config:FTTraceConfig): Promise<void>{
     if(config.enableAutoTrace){
       FTResourceTracking.isEnableTracing = true;
       FTResourceTracking.startTracking();
     }
     return this.trace.setConfig(config);
   }
  /**
   * 获取 trace http 请求头数据。
   * @param key 唯一 id
   * @param url 请求地址
   * @returns a Promise.
   */
   getTraceHeader(url:String): Promise<object>{
     return this.trace.getTraceHeader(url);
   }
 }
 export const FTReactNativeTrace:FTReactNativeTraceType = new FTReactNativeTraceWrapper(); 

