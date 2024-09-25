import { NativeModules } from 'react-native';

export enum SessionReplayPrivacy {
    MASK ,
    ALLOW ,
    MASK_USER_INPUT 
}

export interface FTSessionReplayConfig{
    sampleRate?:number,
    privacy?:SessionReplayPrivacy
  }
type FTReactNativeSessionReplayType = {
    sessionReplayConfig(config:FTSessionReplayConfig): Promise<void>;
}

class FTReactNativeSessionReplayWrapper implements FTReactNativeSessionReplayType {
    private sessionReplay: FTReactNativeSessionReplayType = NativeModules.FTSessionReplay;
    sessionReplayConfig(config:FTSessionReplayConfig): Promise<void>{
        return this.sessionReplay.sessionReplayConfig(config);
    }
}
export const FTReactNativeSessionReplay: FTReactNativeSessionReplayType = new FTReactNativeSessionReplayWrapper();
