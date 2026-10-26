import { bridgeContextManager } from './ft_mobile_agent';
/**
 * Set log level.
 */
export enum FTLogStatus {
  info,
  warning,
  error,
  critical,
  ok,
}
/**
 * Log discard method.
 */
export enum FTLogCacheDiscard {
  discard,
  discardOldest,
}
/**
 * Configure log output configuration.
 * @param logSamplingRate Log sampling percentage in [0, 100], default 100. Supports fractional percentages and takes precedence over sampleRate.
 * @param sampleRate Deprecated log sampling probability in [0, 1], default 1. Used only when logSamplingRate is omitted; multiplied by 100 before passing to Native.
 * @param enableLinkRumData whether to link with RUM
 * @param enableWebViewLog Collect Browser Logs SDK events from WebViews, default false
 * @param enableCustomLog whether to enable custom logs
 * @param discardStrategy log discard strategy
 * @param logLevelFilters log level filter
 * @param globalContext custom global parameters
 * @param logCacheLimitCount get maximum log entry count limit [1000,), default 5000
 */
export interface FTLogConfig {
  /**
   * Log sampling percentage in [0, 100], default 100.
   * Supports fractional percentages: 12.5 means 12.5%, not 0.125.
   * Takes precedence over sampleRate when both are supplied, including 0.
   */
  logSamplingRate?: number;
  /** @deprecated Use logSamplingRate. Probability in [0, 1], default 1; 0.125 maps to 12.5%. Ignored when logSamplingRate is supplied. */
  sampleRate?: number;
  enableLinkRumData?: boolean;
  enableCustomLog?: boolean;
  enableWebViewLog?: boolean;
  discardStrategy?: FTLogCacheDiscard;
  logLevelFilters?: Array<FTLogStatus>;
  globalContext?: object;
  logCacheLimitCount?: number;
}

type FTReactNativeLogType = {
  /**
   *Configure log output configuration to enable log collection.
   */
  logConfig(config: FTLogConfig): Promise<void>;
  /**
   * Output log.
   * @param content log content
   * @param status log status
   * @param property log context (optional)
   */
  logging(
    content: string,
    logStatus: FTLogStatus,
    property?: object
  ): Promise<void>;
  /**
   * Output log.
   * @param content log content
   * @param status log status
   * @param property log context (optional)
   */
  logWithStatusString(
    content: string,
    logStatus: string,
    property?: object
  ): Promise<void>;
};

class FTReactNativeLogWrapper {
  /* eslint-disable @typescript-eslint/no-var-requires */
  private logger: FTReactNativeLogType =
    require('./specs/NativeFTReactNativeLog').default;
  /* eslint-enable @typescript-eslint/no-var-requires */

  /**
   *Configure log output configuration to enable log collection.
   */
  logConfig(config: FTLogConfig): Promise<void> {
    return this.logger.logConfig(config);
  }

  /**
   * Output log.
   * @param content log content
   * @param status log status
   * @param property log context (optional)
   */
  logging(
    content: string,
    logStatus: FTLogStatus | string,
    property?: object
  ): Promise<void> {
    // Automatically merge bridge context properties with local properties
    const mergedProperties =
      bridgeContextManager.mergeWithLocalPropertiesSync(property);

    if (typeof logStatus === 'string') {
      return this.logger.logWithStatusString(
        content,
        logStatus.toString(),
        mergedProperties
      );
    }
    let enumLogStatus: FTLogStatus = logStatus as FTLogStatus;
    return this.logger.logging(content, enumLogStatus, mergedProperties);
  }
}
export const FTReactNativeLog: FTReactNativeLogWrapper =
  new FTReactNativeLogWrapper();
