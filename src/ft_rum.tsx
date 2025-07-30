import { NativeModules } from 'react-native';
import { FTRumErrorTracking} from './rum/FTRumErrorTracking';
import { FTRumActionTracking} from './rum/FTRumActionTracking';

/**
 * Error monitoring type.
 */
 export enum ErrorMonitorType {
   all=0xFFFFFFFF,
   battery=1 << 1,
   memory=1 << 2,
   cpu=1 << 3,
 }
  /**
  * Page monitoring supplement type
  */
 export enum DeviceMetricsMonitorType {
    all=0xFFFFFFFF,
    battery=1 << 1,
    memory=1 << 2,
    cpu=1 << 3,
    fps=1 << 4
 }
 /**
  * Device information monitoring cycle.
  */
 export enum DetectFrequency { normal, frequent, rare }

 export enum FTRUMCacheDiscard { discard, discardOldest };

/**
 * Set RUM tracking conditions.
 * @param androidAppId appId, apply during monitoring
 * @param iOSAppId appId, apply during monitoring
 * @param sampleRate sampling rate
 * @param sessionOnErrorSampleRate error session sampling rate. For sessions not sampled, if ERROR is hit, collect data 1 minute before the error occurs
 * @param enableAutoTrackUserAction whether to automatically collect react-native control click events, can set actionName with accessibilityLabel when enabled
 * @param enableTrackError whether to automatically collect react-native Error
 * @param enableTrackNativeCrash whether to collect Native Error
 * @param enableTrackNativeAppANR whether to collect Native ANR
 * @param enableTrackNativeFreeze whether to collect Native Freeze
 * @param nativeFreezeDurationMs set the threshold for collecting Native Freeze, value range [100,), unit ms. iOS default 250ms, Android default 1000ms
 * @param enableNativeUserAction whether to start Native Action tracking, Button click events, recommended to disable for pure react-native apps
 * @param enableNativeUserView whether to start Native View auto tracking, recommended to disable for pure react-native apps
 * @param enableNativeUserResource whether to automatically collect react-native Resource
 * @param enableResourceHostIP whether to collect network request Host IP (only for native http, iOS 13 and above)
 * @param errorMonitorType error monitoring supplement type
 * @param deviceMonitorType page monitoring supplement type
 * @param detectFrequency monitoring frequency
 * @param globalContext custom global parameters
 * @param rumCacheLimitCount RUM max cache size, default 100_000
 * @param rumDiscardStrategy RUM data discard strategy
 */
 export interface FTRUMConfig{
   androidAppId:string,
   iOSAppId:string,
   sampleRate?:number,
   sessionOnErrorSampleRate?:number,
   enableAutoTrackUserAction?:boolean,
   enableAutoTrackError?:boolean,
   enableTrackNativeCrash?:boolean,
   enableTrackNativeAppANR?:boolean,
   enableTrackNativeFreeze?:boolean,
   nativeFreezeDurationMs?:number,
   enableNativeUserAction?:boolean,
   enableNativeUserView?:boolean,
   enableNativeUserResource?:boolean,
   enableResourceHostIP?:boolean,
   errorMonitorType?:ErrorMonitorType,
   deviceMonitorType?:DeviceMetricsMonitorType,
   detectFrequency?:DetectFrequency
   globalContext?:object,
   rumCacheLimitCount?:number,
   rumDiscardStrategy?:FTRUMCacheDiscard,
 }
/**
 * RUM Resource data.
 * @param url request URL
 * @param httpMethod request method
 * @param requestHeader request header parameters
 * @param responseHeader response header parameters
 * @param responseBody response content
 * @param resourceStatus response status code
 */
 export interface FTRUMResource{
   url:string,
   httpMethod:string,
   requestHeader:object,
   responseHeader?:object,
   responseBody?:string,
   resourceStatus?:number
 };
/**
 * RUM Resource performance metrics.
 * @param duration resource load time
 * @param resource_dns resource DNS resolution time
 * @param resource_tcp resource TCP connection time
 * @param resource_ssl resource SSL connection time
 * @param resource_ttfb resource request response time
 * @param resource_trans resource content transfer time
 * @param resource_first_byte resource first byte time
 */
 export interface FTRUMResourceMetrics{

   duration?:number,
   resource_dns?:number,
   resource_tcp?:number,
   resource_ssl?:number,
   resource_ttfb?:number,
   resource_trans?:number,
   resource_first_byte?:number,
 };
 type FTReactNativeRUMType = {
  /**
   * Set RUM tracking conditions and enable RUM collection.
   * @param config rum configuration parameters.
   * @returns a Promise.
   */
   setConfig(config:FTRUMConfig): Promise<void>;
  /**
   * Start RUM Action.
   * RUM will bind Resource, Error, LongTask events that may be triggered by this Action.
   * Avoid adding multiple times within 0.1s, only one Action will be associated with the same View at the same time, and new Actions will be discarded if the previous one has not ended.
   * Adding Action with `addAction` method does not affect each other.
   * @param actionName action name
   * @param actionType action type
   * @param property event context (optional)
   * @returns a Promise.
   */
   startAction(actionName:string,actionType:string,property?:object): Promise<void>;
   /**
   * Add Action event. This type of data cannot be associated with Error, Resource, LongTask data, and has no discard logic.
   * @param actionName action name
   * @param actionType action type
   * @param property event context (optional)
   * @returns a Promise.
   */
   addAction(actionName:string,actionType:string,property?:object): Promise<void>;
  /**
   * view load duration.
   * @param viewName view name
   * @param loadTime view load duration
   * @returns a Promise.
   */
   onCreateView(viewName:string,loadTime:number): Promise<void>;
  /**
   * view start.
   * @param viewName page name
   * @param property event context (optional)
   * @returns a Promise.
   */
   startView(viewName: string, property?: object): Promise<void>;
  /**
   * view end.
   * @param property event context (optional)
   * @returns a Promise.
   */
   stopView(property?:object): Promise<void>;
  /**
   * Exception capture and log collection.
   * @param stack stack log
   * @param message error message
   * @param property event context (optional)
   * @returns a Promise.
   */
   addError(stack: string, message: string,property?:object): Promise<void>;
  /**
   * Exception capture and log collection.
   * @param type error type
   * @param stack stack log
   * @param message error message
   * @param property event context (optional)
   * @returns a Promise.
   */
   addErrorWithType(type:string,stack: string, message: string,property?:object): Promise<void>;
  /**
   * Start resource request.
   * @param key unique id
   * @param property event context (optional)
   * @returns a Promise.
   */
   startResource(key: string,property?:object): Promise<void>;
  /**
   * End resource request.
   * @param key unique id
   * @param property event context (optional)
   * @returns a Promise.
   */
   stopResource(key: string,property?:object): Promise<void>;
  /**
   * Send resource data metrics.
   * @param key unique id
   * @param resource resource data
   * @param metrics resource performance data
   * @returns a Promise.
   */
   addResource(key:string, resource:FTRUMResource,metrics?:FTRUMResourceMetrics):Promise<void>;
 }

 class FTReactNativeRUMWrapper implements FTReactNativeRUMType {
    private rum: FTReactNativeRUMType = NativeModules.FTReactNativeRUM;


   setConfig(config:FTRUMConfig): Promise<void>{
     console.log('FTRUMConfig');
     if(config.enableAutoTrackError){
        FTRumErrorTracking.startTracking();
     }
     if(config.enableAutoTrackUserAction){
        FTRumActionTracking.startTracking();
     }
     return this.rum.setConfig(config);
   }
   startAction(actionName:string,actionType:string,property?:object): Promise<void>{
     return this.rum.startAction(actionName,actionType,property);
   }
   addAction(actionName: string, actionType: string, property?: object): Promise<void> {
    return this.rum.addAction(actionName,actionType,property);
   }
   onCreateView(viewName:string,loadTime:number): Promise<void>{
     return this.rum.onCreateView(viewName,loadTime);
   }
   startView(viewName: string, property?:object): Promise<void>{
     return this.rum.startView(viewName,property);
   }
   stopView(property?:object): Promise<void>{
     return this.rum.stopView(property);
   }
   addError(stack: string, message: string,property?:object): Promise<void>{
     return this.rum.addError(stack,message,property);
   }
   addErrorWithType(type:string,stack: string, message: string,property?:object): Promise<void>{
    return this.rum.addErrorWithType(type,stack,message,property);
  }
   startResource(key: string,property?:object): Promise<void>{
     return this.rum.startResource(key,property);
   }
   stopResource(key: string,property?:object): Promise<void>{
     return this.rum.stopResource(key,property);
   }
   addResource(key:string, resource:FTRUMResource,metrics:FTRUMResourceMetrics={}):Promise<void>{
     return this.rum.addResource(key,resource,metrics);
   }
 }

 export const FTReactNativeRUM: FTReactNativeRUMType = new FTReactNativeRUMWrapper();

