import { NativeModules } from 'react-native';
import { FTRumErrorTracking} from './rum/FTRumErrorTracking';
import { FTRumActionTracking} from './rum/FTRumActionTracking';

/**
 * 监控类型。
 */
 export enum MonitorType {
   all=0xFFFFFFFF,
   battery=1 << 1,
   memory=1 << 2,
   cpu=1 << 3,
 }
/**
 * 设置 RUM 追踪条件。
 * @param rumAppId appId，监测中申请
 * @param sampleRate 采样率
 * @param enableAutoTrackUserAction 是否自动采集 react-native 控件点击事件，开启后可配合 accessibilityLabel 设置actionName
 * @param enableTrackError  是否自动采集 react-native Error
 * @param enableNativeUserAction 是否开始 Native Action 追踪，Button 点击事件，纯 react-native 应用建议关闭
 * @param enableNativeUserView 是否开始 Native View 自动追踪，纯 react-native 应用建议关闭
 * @param enableNativeUserResource 是否自动采集 react-native Resource
 * @param monitorType 监控补充类型
 * @param globalContext 自定义全局参数
 */
 export interface FTRUMConfig{
   rumAppId:string,
   sampleRate?:number,
   enableAutoTrackUserAction?:boolean,
   enableAutoTrackError?:boolean,
   enableNativeUserAction?:boolean,
   enableNativeUserView?:boolean,
   enableNativeUserResource?:boolean,
   monitorType?:MonitorType,
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
   * @returns a Promise.
   */
   startAction(actionName:string,actionType:string): Promise<void>;
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
   * @returns a Promise.
   */
   startView(viewName: string): Promise<void>;
  /**
   * view 结束。
   * @returns a Promise.
   */
   stopView(): Promise<void>;
  /**
   * 异常捕获与日志收集。
   * @param stack 堆栈日志
   * @param message 错误信息
   * @returns a Promise.
   */
   addError(stack: string, message: string): Promise<void>;
  /**
   * 开始资源请求。
   * @param key 唯一 id
   * @returns a Promise.
   */
   startResource(key: string): Promise<void>;
  /**
   * 结束资源请求。
   * @param key 唯一 id
   * @returns a Promise.
   */
   stopResource(key: string): Promise<void>;
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
   startAction(actionName:string,actionType:string): Promise<void>{
     return this.rum.startAction(actionName,actionType);
   }
   onCreateView(viewName:string,loadTime:number): Promise<void>{
     return this.rum.onCreateView(viewName,loadTime);
   }
   startView(viewName: string): Promise<void>{
     return this.rum.startView(viewName);
   }
   stopView(): Promise<void>{
     return this.rum.stopView();
   }
   addError(stack: string, message: string): Promise<void>{
     return this.rum.addError(stack,message);
   }
   startResource(key: string): Promise<void>{
     return this.rum.startResource(key);
   }
   stopResource(key: string): Promise<void>{
     return this.rum.stopResource(key);
   }
   addResource(key:string, resource:FTRUMResource,metrics:FTRUMResourceMetrics={}):Promise<void>{
     return this.rum.addResource(key,resource,metrics);
   }   
 }

 export const FTReactNativeRUM: FTReactNativeRUMType = new FTReactNativeRUMWrapper();

