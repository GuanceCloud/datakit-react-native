import { NativeModules } from 'react-native';
import { FTResourceTracking} from './rum/FTResourceTracking';
//FTReactNativeTrace

/**
 * 使用 trace 的类型。
 */
 export enum TraceType {
   ddTrace,
   zipkin,
   jaeger
 };
/**
 * 配置 trace 。
 * @param sampleRate 采样率
 * @param serviceName 服务名
 * @param traceType 链路类型
 * @param enableLinkRUMData 是否与 RUM 数据关联
 * @param enableTraceUserResource 是否开启自动追踪 resource
 */
 export interface FTTractConfig{
   sampleRate?:number,
   serviceName?:string,
   traceType?:TraceType,
   enableLinkRUMData?:boolean,
   enableTraceUserResource?:boolean,
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
   setConfig(config: FTTractConfig): Promise<void>; 
  /**
   * 获取 trace http 请求头数据。
   * @param key 唯一 id
   * @param url 请求地址
   * @returns trace 添加的请求头参数  
   */
   getTraceHeader(key: String, url: String): Promise<object>;
  /**
   * 上传 Trace 数据。
   * @param key 唯一 id
   * @param resource trace 数据
   * @returns a Promise.
   */ 
   addTrace(key:string,resource:FTTraceResource): Promise<void>;
 };

 class FTReactNativeTraceWrapper implements FTReactNativeTraceType {
   private trace: FTReactNativeTraceType = NativeModules.FTReactNativeTrace;

   setConfig(config:FTTractConfig): Promise<void>{
     if(config.enableTraceUserResource){
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
   getTraceHeader(key:String,url:String): Promise<object>{
     return this.trace.getTraceHeader(key,url);
   }

   addTrace(key:string,resource:FTTraceResource){
     return this.trace.addTrace(key,resource);
   }
 }
 export const FTReactNativeTrace:FTReactNativeTraceType = new FTReactNativeTraceWrapper(); 

