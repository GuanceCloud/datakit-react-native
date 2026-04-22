// import { NativeModules } from 'react-native';
/**
 * Privacy level for content masking in session replay. Deprecated, recommend using fine-grained privacy levels for settings
 */
export enum SessionReplayPrivacy {
  MASK = 0,
  ALLOW = 1,
  MASK_USER_INPUT = 2,
}

/**
 * Available privacy levels for touch masking in session replay.
 */
export enum TouchPrivacyLevel {
  SHOW = 'SHOW',
  HIDE = 'HIDE',
}

/**
 * Available privacy levels for image masking in session replay
 */
export enum ImagePrivacyLevel {
  MASK_NON_BUNDLED_ONLY = 'MASK_NON_BUNDLED_ONLY',
  MASK_ALL = 'MASK_ALL',
  MASK_NONE = 'MASK_NONE',
}

/**
 * Available privacy levels for text and input masking in session replay
 */
export enum TextAndInputPrivacyLevel {
  MASK_SENSITIVE_INPUTS = 'MASK_SENSITIVE_INPUTS',
  MASK_ALL_INPUTS = 'MASK_ALL_INPUTS',
  MASK_ALL = 'MASK_ALL',
}
/**
 * Set Session Replay configuration.
 * @param sampleRate Sampling rate
 * @param sessionReplayOnErrorSampleRate error session sampling rate. For sessions not sampled, if ERROR is hit, collect data 1 minute before the error occurs
 * @param privacy Privacy level for content masking in session replay
 * @param touchPrivacy Privacy level for touch masking in session replay
 * @param textAndInputPrivacy Privacy level for text and input masking in session replay
 * @param imagePrivacy Privacy level for image masking in session replay
 * @param enableLinkRUMKeys Enable linking RUM data with session replay data. The value is an array of RUM global context keys. When the keys exist in RUM global context, the corresponding values will be linked to session replay data.
 * @returns a Promise.
 */
export interface FTSessionReplayConfig {
  sampleRate?: number;
  sessionReplayOnErrorSampleRate?: number;
  privacy?: SessionReplayPrivacy;
  touchPrivacy?: TouchPrivacyLevel;
  textAndInputPrivacy?: TextAndInputPrivacyLevel;
  imagePrivacy?: ImagePrivacyLevel;
  enableLinkRUMKeys?: string[];
}
type FTReactNativeSessionReplayType = {
  /**
   * Set Session Replay configuration and enable session replay
   * @param config Session Replay configuration parameters.
   * @returns a Promise.
   */
  sessionReplayConfig(config: FTSessionReplayConfig): Promise<void>;
};

class FTReactNativeSessionReplayWrapper
  implements FTReactNativeSessionReplayType
{
  /* eslint-disable @typescript-eslint/no-var-requires */
  private sessionReplay: FTReactNativeSessionReplayType =
    require('./specs/NativeFTReactNativeSessionReplay').default;
  /* eslint-enable @typescript-eslint/no-var-requires */

  sessionReplayConfig(config: FTSessionReplayConfig): Promise<void> {
    return this.sessionReplay.sessionReplayConfig(config);
  }
}
export const FTReactNativeSessionReplay: FTReactNativeSessionReplayType =
  new FTReactNativeSessionReplayWrapper();
