import { NativeModules } from 'react-native';
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
  /// Show all user touches
  SHOW = 0,
  /// Hide all user touches
  HIDE = 1,
}

/**
 * Available privacy levels for image masking in session replay
 */
export enum ImagePrivacyLevel {
  /// Only SF symbols and images loaded using [UIImage imageNamed:]/UIImage(named:) that are bundled in the application will be recorded
  MASK_NON_BUNDLED_ONLY = 0,
  /// No images will be recorded
  MASK_ALL = 1,
  /// All images will be recorded, including images downloaded from the internet or generated during application runtime
  MASK_NONE = 2,
}

/**
 * Available privacy levels for text and input masking in session replay
 */
export enum TextAndInputPrivacyLevel {
  /// Show all text except sensitive inputs. For example: password fields
  MASK_SENSITIVE_INPUTS = 0,
  /// Mask all input fields. For example: textfields, switches, checkboxes
  MASK_ALL_INPUTS = 1,
  /// Mask all text and inputs. For example: label
  MASK_ALL = 2,
}
/**
 * Set Session Replay configuration.
 * @param sampleRate Sampling rate
 * @param privacy Privacy level for content masking in session replay
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
  private sessionReplay: FTReactNativeSessionReplayType =
    NativeModules.FTReactNativeSessionReplay;
  sessionReplayConfig(config: FTSessionReplayConfig): Promise<void> {
    return this.sessionReplay.sessionReplayConfig(config);
  }
}
export const FTReactNativeSessionReplay: FTReactNativeSessionReplayType =
  new FTReactNativeSessionReplayWrapper();
