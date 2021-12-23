import { NativeModules } from 'react-native';
// FTMobileReactNative

//环境
export enum EnvType {
  prod, gray, pre, common, local 
};
/*
 配置启动 SDK 参数
 [serverUrl] 数据上报地址
 [useOAID] 是否使用 OAID 唯一识别，默认false,开启后替换 deviceUUID 进行使用
 [debug] 设置是否允许打印日志，默认false
 [datakitUUID] 请求HTTP请求头X-Datakit-UUID 数据采集端  如果用户不设置会自动配置
 [envType] 环境，默认prod
 */
 export interface FTMobileConfig {
   serverUrl: string,
   useOAID?: string,
   debug?:boolean,
   datakitUUID?:string,
   envType?:EnvType
 }
 type FTMobileReactNativeType = {
   //SDK 初始化方法
   sdkConfig(config:FTMobileConfig): Promise<void>;
   //绑定用户
   bindRUMUserData(userId: string): Promise<void>;
   //解绑用户
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

 //FTReactNativeLog

 //设置日志等级
 export enum FTLogStatus {
   info, warning, error, critical, ok,
 };
 //日志丢弃方式
 export enum FTLogCacheDiscard { discard, discardOldest };
/*
 配置日志输出配置
 [sampleRate] 采样率
 [serviceName] 服务名
 [enableLinkRumData] 是否与 RUM 关联
 [enableCustomLog] 是否开启自定义日志
 [discardStrategy] 日志丢弃策略
 [logLevelFilters] 日志等级过滤
 */
 export interface FTLogConfig{
   sampleRate?: number,
   serviceName?: string ,
   enableLinkRumData?: boolean,
   enableCustomLog?: boolean, 
   discardStrategy?: FTLogCacheDiscard,
   logLevelFilters?: Array<FTLogStatus>,
 };

 type FTReactNativeLogType = {
  /*
   配置日志输出配置 开启日志采集
   */
   logConfig(config: FTLogConfig): Promise<void>;
  /*
   输出日志
   [content] 日志内容
   [status] 日志状态
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

 //FTReactNativeRUM
 // 监控类型
 export enum MonitorType {
   all=0xFFFFFFFF,
   battery=1 << 1,
   memory=1 << 2,
   cpu=1 << 3,
 }
/*
 设置 RUM 追踪条件
 [rumAppId] appId，监测中申请
 [sampleRate] 采样率
 [enableNativeUserAction] 是否开始 Native Action 追踪，Button 点击事件，纯 react-native 应用建议关闭
 [enableNativeUserView] 是否开始 Native View 自动追踪，纯 Flutter 应用建议关闭
 [enableNativeUserResource] 是否开始 Native Resource 自动追踪，纯 Flutter 应用建议关闭
 [monitorType] 监控补充类型
 [globalContext] 自定义全局参数
 */
 export interface FTRUMConfig{
   rumAppId:string,
   sampleRate?:number,
   enableNativeUserAction?:boolean,
   enableNativeUserView?:boolean,
   enableNativeUserResource?:boolean,
   monitorType?:MonitorType,
   globalContext?:object,
 }
/*
 RUM Resource 资源数据
 [url] 请求地址
 [httpMethod] 请求方法
 [requestHeader] 请求头参数
 [responseHeader] 返回头参数
 [responseBody] 返回内容
 [resourceStatus] 返回状态码
 */
 export interface FTRUMResource{
   url:string,
   httpMethod:string,
   requestHeader:object,
   responseHeader?:object,
   responseBody?:string,
   resourceStatus?:number
 };
/*
 RUM Resource 性能指标
 [duration] 资源加载时间
 [resource_dns] 资源加载DNS解析时间 
 [resource_tcp] 资源加载TCP连接时间 
 [resource_ssl] 资源加载SSL连接时间
 [resource_ttfb] 资源加载请求响应时间
 [resource_trans] 资源加载内容传输时间
 [resource_first_byte] 资源加载首包时间
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
   //设置 RUM 追踪条件 开启 RUM 采集
   setConfig(config:FTRUMConfig): Promise<void>;
  /*
   执行 action
   [actionName] action 名称
   [actionType] action 类型
   */
   startAction(actionName:string,actionType:string): Promise<void>;
  /*
   view 开始
   [viewName] 界面名称
   [viewReferer] 前一个界面名称
   */
   startView(viewName: string, viewReferer: string): Promise<void>;
   //view 结束
   stopView(): Promise<void>;
  /*
   异常捕获与日志收集
   [stack] 堆栈日志
   [message]错误信息
   */
   addError(stack: string, message: string): Promise<void>;
  /*
   开始资源请求
   [key] 唯一 id
   */
   startResource(key: string): Promise<void>;
  /*
   结束资源请求
   [key] 唯一 id
   */
   stopResource(key: string): Promise<void>;
  /*
   发送资源数据指标
   [key] 唯一 id
   [resource] 资源数据
   [metrics]  资源性能数据
   */
   addResource(key:string, resource:FTRUMResource,metrics?:FTRUMResourceMetrics):Promise<void>;   
 }
 class FTReactNativeRUMWrapper implements FTReactNativeRUMType {
   private rum: FTReactNativeRUMType = NativeModules.FTReactNativeRUM;

   setConfig(config:FTRUMConfig): Promise<void>{
     return this.rum.setConfig(config);
   }
   startAction(actionName:string,actionType:string): Promise<void>{
     return this.rum.startAction(actionName,actionType);
   }
   startView(viewName: string, viewReferer: string): Promise<void>{
     return this.rum.startView(viewName,viewReferer);
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


 //FTReactNativeTrace

 //使用 trace trace 类型
 export enum TraceType {
   ddTrace,
   zipkin,
   jaeger
 };
/*
  配置 trace
  [sampleRate]采样率
  [serviceName]服务名
  [traceType] 链路类型
  [enableLinkRUMData] 是否与 RUM 数据关联
  [enableNativeAutoTrace] 是否开启原生网络网络自动追踪 iOS NSURLSession ,Android OKhttp
  */
  export interface FTTractConfig{
    sampleRate?:number,
    serviceName?:string,
    traceType?:TraceType,
    enableLinkRUMData?:boolean,
    enableNativeAutoTrace?:boolean
  };
/*
 trace 采集数据
 [httpMethod] 请求方法
 [requestHeader] 请求头参数
 [statusCode] 返回状态码
 [responseHeader] 返回头参数
 [errorMessage] 错误消息
 */
 export interface FTTraceResource{
   httpMethod:string,
   requestHeader:object,
   statusCode?:number,
   responseHeader?:object,
   errorMessage?:string
 };
 type FTReactNativeTraceType = {
   //配置 trace 开启链路追踪
   setConfig(config: FTTractConfig): Promise<void>; 
  /*
   获取 trace http 请求头数据
   [key] 唯一 id
   [url] 请求地址
   */
   getTraceHeader(key: String, url: String): Promise<object>;
  /*
   上传 Trace 数据
   [key] 唯一 id
   [resource] trace 数据
   */ 
   addTrace(key:string,resource:FTTraceResource): Promise<void>;
 };

 class FTReactNativeTraceWrapper implements FTReactNativeTraceType {
   private trace: FTReactNativeTraceType = NativeModules.FTReactNativeTrace;

   setConfig(config:FTTractConfig): Promise<void>{
     return this.trace.setConfig(config);
   }

   getTraceHeader(key:String,url:String): Promise<object>{
     return this.trace.getTraceHeader(key,url);
   }

   addTrace(key:string,resource:FTTraceResource){
     return this.trace.addTrace(key,resource);
   }
 }


 const FTMobileReactNative: FTMobileReactNativeType = new FTMobileReactNativeWrapper();
 const FTReactNativeLog: FTReactNativeLogType = new FTReactNativeLogWrapper();
 const FTReactNativeRUM: FTReactNativeRUMType = new FTReactNativeRUMWrapper();
 const FTReactNativeTrace:FTReactNativeTraceType = new FTReactNativeTraceWrapper(); 
 export {
   FTMobileReactNative,
   FTReactNativeLog,
   FTReactNativeRUM,
   FTReactNativeTrace,
 };

