import { NativeModules } from 'react-native';

type FTMobileReactNativeType = {
  sdkConfig(serverUrl: String, context?: object): Promise<void>;
  bindRUMUserData(userId: String): Promise<void>;
  unbindRUMUserData(): Promise<void>;
};

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

const FTMobileReactNative: FTMobileReactNativeType =
  new FTMobileReactNativeWrapper();
const FTReactNativeLog = NativeModules.FTReactNativeLog;
const FTReactNativeRUM = NativeModules.FTReactNativeRUM;
const FTReactNativeTrace = NativeModules.FTReactNativeTrace;

export {
  FTMobileReactNative,
  FTReactNativeLog,
  FTReactNativeRUM,
  FTReactNativeTrace,
};
