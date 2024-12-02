import { NativeModules } from 'react-native';
import { FTRumErrorTracking} from './rum/FTRumErrorTracking';
import { FTRumActionTracking} from './rum/FTRumActionTracking';

/**
 * 错误监控类型。
 */
 export enum ErrorMonitorType {
   all=0xFFFFFFFF,
   battery=1 << 1,
   memory=1 << 2,
   cpu=1 << 3,
 }
  /**
  * 页面监控补充类型
  */
 export enum DeviceMetricsMonitorType {
    all=0xFFFFFFFF,
    battery=1 << 1,
    memory=1 << 2,
    cpu=1 << 3,
    fps=1 << 4
 }
 /**
  * 设备信息监控周期。
  */
 export enum DetectFrequency { normal, frequent, rare }
/**
 * 设置 RUM 追踪条件。
 * @param androidAppId appId，监测中申请
 * @param iOSAppId appId，监测中申请
 * @param sampleRate 采样率
 * @param enableAutoTrackUserAction 是否自动采集 react-native 控件点击事件，开启后可配合 accessibilityLabel 设置actionName
 * @param enableTrackError  是否自动采集 react-native Error
 * @param enableTrackNativeCrash 是否采集 Native Error
 * @param enableTrackNativeAppANR 是否采集 Native ANR
 * @param enableTrackNativeFreeze 是否采集 Native Freeze
 * @param nativeFreezeDurationMs 设置采集 Native 卡顿的阈值。单位毫秒 100 < freezeDurationMs ，默认 250ms
 * @param enableNativeUserAction 是否开始 Native Action 追踪，Button 点击事件，纯 react-native 应用建议关闭
 * @param enableNativeUserView 是否开始 Native View 自动追踪，纯 react-native 应用建议关闭
 * @param enableNativeUserResource 是否自动采集 react-native Resource
 * @param enableResourceHostIP 是否采集网络请求 Host IP (仅作用于native http，iOS 13及以上)
 * @param errorMonitorType 错误监控补充类型
 * @param deviceMonitorType 页面监控补充类型
 * @param detectFrequency 监控频率
 * @param globalContext 自定义全局参数
 */
 export interface FTRUMConfig{
   androidAppId:string,
   iOSAppId:string,
   sampleRate?:number,
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
 }
/**
 * RUM Resource 资源数据。
 * @param url] 请求地址
 * @param httpMethod 请求方法
 * @param requestHeader 请求头参数
 * @param responseHeader 返回头参数
 * @param responseBody 返回内容
 * @param resourceStatus 返回状态码
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
 * RUM Resource 性能指标。
 * @param duration 资源加载时间
 * @param resource_dns 资源加载DNS解析时间
 * @param resource_tcp 资源加载TCP连接时间
 * @param resource_ssl 资源加载SSL连接时间
 * @param resource_ttfb 资源加载请求响应时间
 * @param resource_trans 资源加载内容传输时间
 * @param resource_first_byte 资源加载首包时间
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
   * 设置 RUM 追踪条件 开启 RUM 采集。
   * @param config rum 配置参数。
   * @returns a Promise.
   */
   setConfig(config:FTRUMConfig): Promise<void>;
  /**
   * 执行 action 。
   * @param actionName action 名称
   * @param actionType action 类型
   * @param property 事件上下文(可选)
   * @returns a Promise.
   */
   startAction(actionName:string,actionType:string,property?:object): Promise<void>;
  /**
   * view加载时长。
   * @param viewName view 名称
   * @param loadTime view 加载时长
   * @returns a Promise.
   */
   onCreateView(viewName:string,loadTime:number): Promise<void>;
  /**
   * view 开始。
   * @param viewName 界面名称
   * @param property 事件上下文(可选)
   * @returns a Promise.
   */
   startView(viewName: string, property?: object): Promise<void>;
  /**
   * view 结束。
   * @param property 事件上下文(可选)
   * @returns a Promise.
   */
   stopView(property?:object): Promise<void>;
  /**
   * 异常捕获与日志收集。
   * @param stack 堆栈日志
   * @param message 错误信息
   * @param property 事件上下文(可选)
   * @returns a Promise.
   */
   addError(stack: string, message: string,property?:object): Promise<void>;
  /**
   * 异常捕获与日志收集。
   * @param type 错误类型
   * @param stack 堆栈日志
   * @param message 错误信息
   * @param property 事件上下文(可选)
   * @returns a Promise.
   */
   addErrorWithType(type:string,stack: string, message: string,property?:object): Promise<void>;
  /**
   * 开始资源请求。
   * @param key 唯一 id
   * @param property 事件上下文(可选)
   * @returns a Promise.
   */
   startResource(key: string,property?:object): Promise<void>;
  /**
   * 结束资源请求。
   * @param key 唯一 id
   * @param property 事件上下文(可选)
   * @returns a Promise.
   */
   stopResource(key: string,property?:object): Promise<void>;
  /**
   * 发送资源数据指标。
   * @param key 唯一 id
   * @param resource 资源数据
   * @param metrics  资源性能数据
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

