import { NativeModules } from 'react-native';
/**
 * 会话重播中内容屏蔽的隐私级别。
 */
export enum SessionReplayPrivacy {
    MASK ,
    ALLOW ,
    MASK_USER_INPUT 
}
/**
 * 设置 Session Replay 配置.
 * @param sampleRate 采样率
 * @param privacy 会话重播中内容屏蔽的隐私级别
 */
export interface FTSessionReplayConfig{
    sampleRate?:number,
    privacy?:SessionReplayPrivacy
  }
type FTReactNativeSessionReplayType = {
  /**
   * 设置 Session Replay 配置，开启会话重放
   * @param config Session Replay 配置参数。
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
