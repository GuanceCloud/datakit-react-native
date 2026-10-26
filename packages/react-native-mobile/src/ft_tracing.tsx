// import { NativeModules } from 'react-native';
//FTReactNativeTrace

import { FTRumWebSocketTracking } from './rum/FTRumWebSocketTracking';

/**
 * Trace types for use.
 */
export enum TraceType {
  //
  //  datadog trace
  //
  //  x-datadog-trace-id
  //  x-datadog-parent-id
  //  x-datadog-sampling-priority
  //  x-datadog-origin
  //
  ddTrace,
  //
  //  zipkin multi header
  //
  //  X-B3-TraceId
  //  X-B3-SpanId
  //  X-B3-Sampled
  //
  zipkinMulti,
  /// zipkin single header,b3
  zipkinSingle,
  //  w3c, traceparent
  traceparent,
  // skywalking 8.0+, sw-8
  skywalking,
  // jaeger, header uber-trace-id
  jaeger,
}
/**
 * Configure trace.
 * @param traceSamplingRate Trace sampling percentage in [0, 100], default 100. Supports fractional percentages and takes precedence over sampleRate.
 * @param sampleRate Deprecated Trace sampling probability in [0, 1], default 1. Used only when traceSamplingRate is omitted; multiplied by 100 before passing to Native.
 * @param traceType trace type
 * @param enableLinkRUMData whether to link with RUM data
 * @param enableNativeAutoTrace whether to enable automatic tracing
 */
export interface FTTraceConfig {
  /**
   * Trace sampling percentage in [0, 100], default 100.
   * Supports fractional percentages: 12.5 means 12.5%, not 0.125.
   * Takes precedence over sampleRate when both are supplied, including 0.
   */
  traceSamplingRate?: number;
  /** @deprecated Use traceSamplingRate. Probability in [0, 1], default 1; 0.125 maps to 12.5%. Ignored when traceSamplingRate is supplied. */
  sampleRate?: number;
  traceType?: TraceType;
  enableLinkRUMData?: boolean;
  enableNativeAutoTrace?: boolean;
}

type FTReactNativeTraceType = {
  /**
   * Configure trace to enable distributed tracing.
   * @param config trace configuration parameters.
   * @returns a Promise.
   */
  setConfig(config: FTTraceConfig): Promise<void>;
  /**
   * Get trace HTTP request header data.
   * @param url request URL
   * @returns trace request header parameters
   * @deprecated use getTraceHeaderFields() replace.
   */
  getTraceHeader(key: string, url: string): Promise<object>;
  /**
   * Get trace HTTP request header data.
   * @param url request URL
   * @returns trace request header parameters
   */
  getTraceHeaderFields(url: string, key?: string): Promise<object>;
};

class FTReactNativeTraceWrapper implements FTReactNativeTraceType {
  private webSocketConfigVersion = 0;
  /* eslint-disable @typescript-eslint/no-var-requires */
  private trace: FTReactNativeTraceType =
    require('./specs/NativeFTReactNativeTrace').default;
  /* eslint-enable @typescript-eslint/no-var-requires */

  setConfig(config: FTTraceConfig): Promise<void> {
    const webSocketLifecycle = FTRumWebSocketTracking.getLifecycleVersion();
    const webSocketConfigVersion = ++this.webSocketConfigVersion;
    const traceWebSocket = config.enableNativeAutoTrace === true;
    return this.trace.setConfig(config).then(() => {
      if (
        webSocketLifecycle !== FTRumWebSocketTracking.getLifecycleVersion() ||
        webSocketConfigVersion !== this.webSocketConfigVersion
      ) {
        return;
      }
      FTRumWebSocketTracking.setNativeAutoTraceEnabled(traceWebSocket);
    });
  }
  /**
   * Get trace HTTP request header data.
   * @param key unique id
   * @param url request URL
   * @returns a Promise.
   */
  getTraceHeader(key: string, url: string): Promise<object> {
    return this.trace.getTraceHeaderFields(url, key);
  }
  /**
   * Get trace HTTP request header data.
   * @param url request URL
   * @param key unique id
   * @returns a Promise.
   */
  getTraceHeaderFields(url: string, key?: string): Promise<object> {
    return this.trace.getTraceHeaderFields(url, key);
  }
}
export const FTReactNativeTrace: FTReactNativeTraceType =
  new FTReactNativeTraceWrapper();
