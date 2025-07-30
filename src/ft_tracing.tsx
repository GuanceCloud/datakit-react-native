import { NativeModules } from 'react-native';
//FTReactNativeTrace

/**
 * Trace types for use.
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
 * Configure trace.
 * @param sampleRate sampling rate
 * @param traceType trace type
 * @param enableLinkRUMData whether to link with RUM data
 * @param enableNativeAutoTrace whether to enable automatic tracing
 */
 export interface FTTraceConfig{
   sampleRate?:number,
   traceType?:TraceType,
   enableLinkRUMData?:boolean,
   enableNativeAutoTrace?:boolean,
 };

 type FTReactNativeTraceType = {
  /**
   * Configure trace to enable distributed tracing.
   * @param config trace configuration parameters.
   * @returns a Promise.
   */
   setConfig(config: FTTraceConfig): Promise<void>; 
  /**
   * Get trace HTTP request header data.
   * @param url request URL
   * @returns trace request header parameters
   * @deprecated use getTraceHeaderFields() replace.
   */
   getTraceHeader(key:String, url: String): Promise<object>;
   /**
   * Get trace HTTP request header data.
   * @param url request URL
   * @returns trace request header parameters
   */
   getTraceHeaderFields(url: String,key?:String): Promise<object>;
 };

 class FTReactNativeTraceWrapper implements FTReactNativeTraceType {
   private trace: FTReactNativeTraceType = NativeModules.FTReactNativeTrace;


   setConfig(config:FTTraceConfig): Promise<void>{
     return this.trace.setConfig(config);
   }
  /**
   * Get trace HTTP request header data.
   * @param key unique id
   * @param url request URL
   * @returns a Promise.
   */
   getTraceHeader(key:String, url: String): Promise<object>{
     return this.trace.getTraceHeaderFields(url,key);
   }
    /**
   * Get trace HTTP request header data.
   * @param url request URL
   * @param key unique id
   * @returns a Promise.
   */
   getTraceHeaderFields(url: String,key?:String): Promise<object>{
    return this.trace.getTraceHeaderFields(url,key);
   }

 }
 export const FTReactNativeTrace:FTReactNativeTraceType = new FTReactNativeTraceWrapper(); 

