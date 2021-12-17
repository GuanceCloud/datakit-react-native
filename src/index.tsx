import { NativeModules } from 'react-native';

type FTMobileReactNativeType = {
  sdkConfig(serverUrl: String, context?: object): Promise<void>;
  bindRUMUserData(userId: String): Promise<void>;
  unbindRUMUserData(): Promise<void>;
};

type FTReactNativeLogType = {
  logConfig(context?: object): Promise<void>;
  logging(content:String,logStatus:number): Promise<void>;
};

type FTReactNativeRUMType = {
  setConfig(rumAppId:String,context?:object): Promise<void>;
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

type FTReactNativeTraceType = {
  setConfig(context?: object): Promise<void>;
  getTraceHeader(key: String, url: String): Promise<object>; 
  addTrace(
    key: String,
    httpMethod: String,
    requestHeader:object,
    statusCode?: number,
    responseHeader?: object,
    errorMessage?: String
    ): Promise<void>;
}



class FTMobileReactNativeWrapper implements FTMobileReactNativeType {
  private sdk: FTMobileReactNativeType = NativeModules.FTMobileReactNative;

  sdkConfig(serverUrl: String, context: object = {}): Promise<void> {
    return this.sdk.sdkConfig(serverUrl, context);
  }

  bindRUMUserData(userId: String): Promise<void> {
    return this.sdk.bindRUMUserData(userId);
  }

  unbindRUMUserData(): Promise<void> {
    return this.sdk.unbindRUMUserData();
  }

}

class FTReactNativeLogWrapper implements FTReactNativeLogType {
  private logger: FTReactNativeLogType = NativeModules.FTReactNativeLog;

  logConfig(context:object = {}): Promise<void>{
    return this.logger.logConfig(context);
  }

  logging(content:String,logStatus:number): Promise<void>{
    return this.logger.logging(content,logStatus);
  }

}
class FTReactNativeRUMWrapper implements FTReactNativeRUMType {
  private rum: FTReactNativeRUMType = NativeModules.FTReactNativeRUM;

  setConfig(rumAppId:String,context:object = {}): Promise<void>{
    return this.rum.setConfig(rumAppId,context);
  }
  startAction(actionName:String,actionType:String): Promise<void>{
    return this.rum.startAction(actionName,actionType);
  }
  statView(viewName: String, viewReferer: String): Promise<void>{
    return this.rum.statView(viewName,viewReferer);
  }
  stopView(): Promise<void>{
    return this.rum.stopView();
  }
  addError(stack: String, message: String): Promise<void>{
    return this.rum.addError(stack,message);
  }
  startResource(key: String): Promise<void>{
    return this.rum.startResource(key);
  }
  stopResource(key: String): Promise<void>{
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

class FTReactNativeTraceWrapper implements FTReactNativeTraceType {
 private trace: FTReactNativeTraceType = NativeModules.FTReactNativeTrace;

 setConfig(context:object = {}): Promise<void>{
   return this.trace.setConfig(context);
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

