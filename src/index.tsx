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
  all,battery,memory,cpu
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
type FTReactNativeRUMType = {
  setConfig(config:FTRUMConfig): Promise<void>;
  startAction(actionName:String,actionType:String): Promise<void>;
  statView(viewName: String, viewReferer: String): Promise<void>;
  stopView(): Promise<void>;
  addError(stack: String, message: String): Promise<void>;
  startResource(key: String): Promise<void>;
  stopResource(key: String): Promise<void>;
  addResource(
    key: String,
    url: String,
    httpMethod: String,
    context?: object,
    ):Promise<void>;   
}
class FTReactNativeRUMWrapper implements FTReactNativeRUMType {
  private rum: FTReactNativeRUMType = NativeModules.FTReactNativeRUM;

  setConfig(config:FTRUMConfig): Promise<void>{
    console.log(config);
    return this.rum.setConfig(config);
  }
  startAction(actionName:string,actionType:string): Promise<void>{
    return this.rum.startAction(actionName,actionType);
  }
  statView(viewName: string, viewReferer: string): Promise<void>{
    return this.rum.statView(viewName,viewReferer);
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
  addResource(
    key: String,
    url: String,
    httpMethod: String,
    context: object = {},
    ):Promise<void>{
    return this.rum.addResource(key,url,httpMethod,context);
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
type FTReactNativeTraceType = {
  setConfig(config: FTTractConfig): Promise<void>;
  getTraceHeader(key: String, url: String): Promise<object>; 
  addTrace(
    key: String,
    httpMethod: String,
    requestHeader:Object,
    statusCode?: Number,
    responseHeader?: Object,
    errorMessage?: String
    ): Promise<void>;
};

class FTReactNativeTraceWrapper implements FTReactNativeTraceType {
  private trace: FTReactNativeTraceType = NativeModules.FTReactNativeTrace;

  setConfig(config:FTTractConfig): Promise<void>{
    return this.trace.setConfig(config);
  }

  getTraceHeader(key:String,url:String): Promise<object>{
    return this.trace.getTraceHeader(key,url);
  }

  addTrace(
    key:String,
    httpMethod:String,
    requestHeader:object,
    statusCode:number = -1,
    responseHeader:object = {},
    errorMessage:String = ''){
    return this.trace.addTrace(key,httpMethod,requestHeader,statusCode,responseHeader,errorMessage);
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

