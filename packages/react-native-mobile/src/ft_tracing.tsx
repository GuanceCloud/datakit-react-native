// import { NativeModules } from 'react-native';
//FTReactNativeTrace

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
 * @param sampleRate sampling rate
 * @param traceType trace type
 * @param enableLinkRUMData whether to link with RUM data
 * @param enableNativeAutoTrace whether to enable automatic tracing
 */
export interface FTTraceConfig {
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
  /* eslint-disable @typescript-eslint/no-var-requires */
  private trace: FTReactNativeTraceType =
    require('./specs/NativeFTReactNativeTrace').default;
  /* eslint-enable @typescript-eslint/no-var-requires */

  setConfig(config: FTTraceConfig): Promise<void> {
    return this.trace.setConfig(config);
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
