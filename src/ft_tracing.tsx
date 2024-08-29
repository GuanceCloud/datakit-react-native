import { NativeModules } from 'react-native';
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
 * @param enableNativeAutoTrace 是否开启自动追踪 
 */
 export interface FTTraceConfig{
   sampleRate?:number,
   traceType?:TraceType,
   enableLinkRUMData?:boolean,
   enableNativeAutoTrace?:boolean,
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
   * @deprecated use getTraceHeaderFields() replace.
   */
   getTraceHeader(key:String, url: String): Promise<object>;
   /**
   * 获取 trace http 请求头数据。
   * @param url 请求地址
   * @returns trace 添加的请求头参数  
   */
   getTraceHeaderFields(url: String,key?:String): Promise<object>;
 };

 class FTReactNativeTraceWrapper implements FTReactNativeTraceType {
   private trace: FTReactNativeTraceType = NativeModules.FTReactNativeTrace;

   setConfig(config:FTTraceConfig): Promise<void>{
     return this.trace.setConfig(config);
   }
  /**
   * 获取 trace http 请求头数据。
   * @param key 唯一 id
   * @param url 请求地址
   * @returns a Promise.
   */
   getTraceHeader(key:String, url: String): Promise<object>{
     return this.trace.getTraceHeaderFields(url,key);
   }
    /**
   * 获取 trace http 请求头数据。
   * @param url 请求地址
   * @param key 唯一 id
   * @returns a Promise.
   */
   getTraceHeaderFields(url: String,key?:String): Promise<object>{
    return this.trace.getTraceHeaderFields(url,key);
   }

 }
 export const FTReactNativeTrace:FTReactNativeTraceType = new FTReactNativeTraceWrapper(); 

