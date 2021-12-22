import { NativeModules } from 'react-native';
// FTMobileReactNative
export enum EnvType {
  prod, gray, pre, common, local 
};
export interface FTMobileConfig {
  serverUrl: string,
  useOAID?: string,
  debug?:boolean,
  datakitUUID?:string,
  envType?:EnvType
}
type FTMobileReactNativeType = {
  sdkConfig(config:FTMobileConfig): Promise<void>;
  bindRUMUserData(userId: string): Promise<void>;
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

export interface FTLogConfig{
  sampleRate?: number,
  serviceName?: string ,
  enableLinkRumData?: boolean,
  enableCustomLog?: boolean, 
  discardStrategy?: FTLogCacheDiscard,
  logLevelFilters?: Array<FTLogStatus>,
};

type FTReactNativeLogType = {
  logConfig(config: FTLogConfig): Promise<void>;
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
/// 监控类型
export enum MonitorType {
  all=0xFFFFFFFF,
  battery=1 << 1,
  memory=1 << 2,
  cpu=1 << 3,
}
export interface FTRUMConfig{
  rumAppId:string,
  sampleRate?:number,
  enableNativeUserAction?:boolean,
  enableNativeUserView?:boolean,
  enableNativeUserResource?:boolean,
  monitorType?:MonitorType,
  globalContext?:object,
}
export interface FTRUMResource{
  key:string,
  url:string,
  httpMethod:string,
  requestHeader:object,
  responseHeader?:object,
  responseBody?:string,
  resourceStatus?:number
};
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
  setConfig(config:FTRUMConfig): Promise<void>;
  startAction(actionName:string,actionType:string): Promise<void>;
  startView(viewName: string, viewReferer: string): Promise<void>;
  stopView(): Promise<void>;
  addError(stack: string, message: string): Promise<void>;
  startResource(key: string): Promise<void>;
  stopResource(key: string): Promise<void>;
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
export enum TraceType {
  ddTrace,
  zipkin,
  jaeger
};
export interface FTTractConfig{
  sampleRate?:number,
  serviceName?:string,
  traceType?:TraceType,
  enableLinkRUMData?:boolean,
  enableNativeAutoTrace?:boolean
}
export interface FTTraceResource{
  key:string,
  httpMethod:string,
  requestHeader:object,
  statusCode?:number,
  responseHeader?:object,
  errorMessage?:string
};
type FTReactNativeTraceType = {
  setConfig(config: FTTractConfig): Promise<void>;
  getTraceHeader(key: String, url: String): Promise<object>; 
  addTrace(resource:FTTraceResource): Promise<void>;
};

class FTReactNativeTraceWrapper implements FTReactNativeTraceType {
  private trace: FTReactNativeTraceType = NativeModules.FTReactNativeTrace;

  setConfig(config:FTTractConfig): Promise<void>{
    return this.trace.setConfig(config);
  }

  getTraceHeader(key:String,url:String): Promise<object>{
    return this.trace.getTraceHeader(key,url);
  }

  addTrace(resource:FTTraceResource){
    return this.trace.addTrace(resource);
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

