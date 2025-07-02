import { NativeModules } from 'react-native';
/**
 * Privacy level for content masking in session replay.
 */
export enum SessionReplayPrivacy {
    MASK ,
    ALLOW ,
    MASK_USER_INPUT
}
/**
 * Set Session Replay configuration.
 * @param sampleRate Sampling rate
 * @param privacy Privacy level for content masking in session replay
 */
export interface FTSessionReplayConfig{
    sampleRate?:number,
    privacy?:SessionReplayPrivacy
  }
type FTReactNativeSessionReplayType = {
  /**
   * Set Session Replay configuration and enable session replay
   * @param config Session Replay configuration parameters.
   * @returns a Promise.
   */
    sessionReplayConfig(config:FTSessionReplayConfig): Promise<void>;
}

class FTReactNativeSessionReplayWrapper implements FTReactNativeSessionReplayType {
    private sessionReplay: FTReactNativeSessionReplayType = NativeModules.FTReactNativeSessionReplay;
    sessionReplayConfig(config:FTSessionReplayConfig): Promise<void>{
        return this.sessionReplay.sessionReplayConfig(config);
    }
}
export const FTReactNativeSessionReplay: FTReactNativeSessionReplayType = new FTReactNativeSessionReplayWrapper();
