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
 * @param sessionReplaySamplingRate Session Replay sampling percentage in [0, 100], default 100. Supports fractional percentages and takes precedence over sampleRate.
 * @param sessionReplayOnErrorSamplingRate Sampling percentage in [0, 100] for otherwise unsampled replay sessions when an error occurs, default 0. Supports fractional percentages and takes precedence over sessionReplayOnErrorSampleRate.
 * @param sampleRate Deprecated Session Replay sampling probability in [0, 1], default 1. Used only when sessionReplaySamplingRate is omitted; multiplied by 100 before passing to Native.
 * @param sessionReplayOnErrorSampleRate Deprecated error replay sampling probability in [0, 1], default 0. Used only when sessionReplayOnErrorSamplingRate is omitted; multiplied by 100 before passing to Native.
 * @param privacy Privacy level for content masking in session replay
 * @param touchPrivacy Privacy level for touch masking in session replay
 * @param textAndInputPrivacy Privacy level for text and input masking in session replay
 * @param imagePrivacy Privacy level for image masking in session replay
 * @param enableLinkRUMKeys Enable linking RUM data with session replay data. The value is an array of RUM global context keys. When the keys exist in RUM global context, the corresponding values will be linked to session replay data.
 * @returns a Promise.
 */
export interface FTSessionReplayConfig {
  /**
   * Session Replay sampling percentage in [0, 100], default 100.
   * Supports fractional percentages: 12.5 means 12.5%, not 0.125.
   * Takes precedence over sampleRate when both are supplied, including 0.
   * Setting 0 disables regular replay sampling; error replay sampling is separate.
   */
  sessionReplaySamplingRate?: number;
  /** @deprecated Use sessionReplaySamplingRate. Probability in [0, 1], default 1; 0.125 maps to 12.5%. Ignored when sessionReplaySamplingRate is supplied. */
  sampleRate?: number;
  /**
   * Sampling percentage for otherwise unsampled replay sessions when an error occurs.
   * Range [0, 100], default 0; fractional percentages are supported.
   * Takes precedence over sessionReplayOnErrorSampleRate when both are supplied, including 0.
   */
  sessionReplayOnErrorSamplingRate?: number;
  /** @deprecated Use sessionReplayOnErrorSamplingRate. Probability in [0, 1], default 0; multiplied by 100. Ignored when sessionReplayOnErrorSamplingRate is supplied. */
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
