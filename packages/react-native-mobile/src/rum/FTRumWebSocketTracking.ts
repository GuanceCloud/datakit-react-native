/* global WebSocket */
import { Platform } from 'react-native';
import NativeFTReactNativeTrace from '../specs/NativeFTReactNativeTrace';
import { startWebSocketTiming } from './FTRumWebSocketTiming';
import {
  clearNativeWebSocketSessions,
  startNativeWebSocketSession,
  webSocketNativeID,
} from './FTRumWebSocketNative';
import type {
  NativeWebSocketSession,
  NativeWebSocketResource,
} from './FTRumWebSocketNative';

type WebSocketConstructor = typeof WebSocket;
type WebSocketHandshakeState = 'success' | 'rejected' | 'failed';

interface ReactNativeWebSocketOptions {
  headers?: Record<string, unknown>;
  [key: string]: unknown;
}

interface FTRUMWebSocketResource {
  url: string;
  httpMethod: string;
  requestHeader: Record<string, unknown>;
  resourceStatus: number;
  responseHeader?: Record<string, string>;
  resourceType: 'websocket';
  webSocketHandshake: true;
  webSocketHandshakeState: WebSocketHandshakeState;
  errorMessage?: string;
}

interface WebSocketHandshakeError {
  message?: string;
}

interface FTRumWebSocketResourceReporter {
  startResource(key: string): Promise<void>;
  stopResource(key: string): Promise<void>;
  addResource(
    key: string,
    resource: FTRUMWebSocketResource,
    metrics?: { duration?: number; resource_http_protocol?: string }
  ): Promise<void>;
}

type RuntimeGlobal = typeof globalThis & {
  WebSocket: WebSocketConstructor;
  __DEV__?: boolean;
};

const REACT_NATIVE_DEV_WEBSOCKET =
  /^wss?:\/\/(?:(?:10|172|192)\.[0-9]+\.[0-9]+\.[0-9]+|localhost|127\.0\.0\.1|\[::1\]):808[0-9]\/(?:hot|symbolicate|message|inspector|status|assets|logs|debugger-proxy)(?:[/?#].*)?$/i;

// SocketRocket embeds the actual response status in this description, which
// RCTWebSocketModule forwards to JS. Do not match proxy errors or bare numbers.
const SOCKET_ROCKET_HTTP_ERROR =
  /^Received\s+bad\s+response\s+code\s+from\s+server\s*:\s*([1-9]\d{2})\s*\.?$/i;
const MAX_HTTP_ERROR_PARSE_LENGTH = 512;

export class FTRumWebSocketTracking {
  private static enabled = false;
  private static installed = false;
  private static originalWebSocket: WebSocketConstructor | null = null;
  private static instrumentedWebSocket: WebSocketConstructor | null = null;
  private static resourceReporter: FTRumWebSocketResourceReporter | null = null;
  private static nativeAutoTraceEnabled = false;
  private static warnedFailures = new Set<string>();
  private static lifecycleVersion = 0;
  private static nativeSession: NativeWebSocketSession | undefined;
  private static pendingHandshakes = new Set<() => void>();

  /** Identifies configuration and reporting work started before SDK shutdown. */
  static getLifecycleVersion(): number {
    return FTRumWebSocketTracking.lifecycleVersion;
  }

  static shutDown(): void {
    FTRumWebSocketTracking.lifecycleVersion += 1;
    clearNativeWebSocketSessions();
    FTRumWebSocketTracking.setNativeAutoTraceEnabled(false);
    FTRumWebSocketTracking.stopTracking();
    FTRumWebSocketTracking.pendingHandshakes.forEach((removeListeners) =>
      removeListeners()
    );
    FTRumWebSocketTracking.pendingHandshakes.clear();
    FTRumWebSocketTracking.warnedFailures.clear();
  }

  static setNativeAutoTraceEnabled(enabled: boolean): void {
    FTRumWebSocketTracking.nativeAutoTraceEnabled = enabled;
  }

  private static stopNativeSession(): void {
    FTRumWebSocketTracking.nativeSession?.stop();
    FTRumWebSocketTracking.nativeSession = undefined;
  }

  static startTracking(resourceReporter: FTRumWebSocketResourceReporter): void {
    if (Platform.OS !== 'ios') {
      return;
    }

    FTRumWebSocketTracking.enabled = true;
    FTRumWebSocketTracking.resourceReporter = resourceReporter;
    const runtimeGlobal = globalThis as RuntimeGlobal;
    const originalWebSocket = runtimeGlobal.WebSocket;
    if (originalWebSocket === FTRumWebSocketTracking.instrumentedWebSocket) {
      return;
    }
    if (typeof originalWebSocket !== 'function') {
      FTRumWebSocketTracking.stopNativeSession();
      return;
    }

    if (!FTRumWebSocketTracking.nativeSession) {
      FTRumWebSocketTracking.nativeSession = startNativeWebSocketSession(() =>
        FTRumWebSocketTracking.createResourceKey()
      );
    }

    const InstrumentedWebSocket = function (
      this: WebSocket,
      ...args: unknown[]
    ): WebSocket {
      if (!new.target) {
        return Reflect.apply(originalWebSocket, this, args);
      }
      // A constructor retained before stop/reinitialization must stay passive.
      if (
        FTRumWebSocketTracking.instrumentedWebSocket !== InstrumentedWebSocket
      ) {
        return Reflect.construct(originalWebSocket, args, new.target);
      }
      return FTRumWebSocketTracking.createWebSocket(
        originalWebSocket,
        args,
        new.target as unknown as WebSocketConstructor
      );
    } as unknown as WebSocketConstructor;

    try {
      InstrumentedWebSocket.prototype = originalWebSocket.prototype;
      Object.setPrototypeOf(InstrumentedWebSocket, originalWebSocket);
      runtimeGlobal.WebSocket = InstrumentedWebSocket;
      if (runtimeGlobal.WebSocket !== InstrumentedWebSocket) {
        FTRumWebSocketTracking.warnOnce(
          'Unable to install WebSocket tracking.'
        );
        FTRumWebSocketTracking.stopNativeSession();
        return;
      }
      FTRumWebSocketTracking.originalWebSocket = originalWebSocket;
      FTRumWebSocketTracking.instrumentedWebSocket = InstrumentedWebSocket;
      FTRumWebSocketTracking.installed = true;
    } catch {
      FTRumWebSocketTracking.stopNativeSession();
      FTRumWebSocketTracking.warnOnce('Unable to install WebSocket tracking.');
    }
  }

  static stopTracking(): void {
    FTRumWebSocketTracking.stopNativeSession();
    FTRumWebSocketTracking.enabled = false;
    FTRumWebSocketTracking.resourceReporter = null;
    if (!FTRumWebSocketTracking.installed) {
      return;
    }

    const runtimeGlobal = globalThis as RuntimeGlobal;
    if (
      runtimeGlobal.WebSocket ===
        FTRumWebSocketTracking.instrumentedWebSocket &&
      FTRumWebSocketTracking.originalWebSocket
    ) {
      try {
        runtimeGlobal.WebSocket = FTRumWebSocketTracking.originalWebSocket;
        if (
          runtimeGlobal.WebSocket !== FTRumWebSocketTracking.originalWebSocket
        ) {
          FTRumWebSocketTracking.warnOnce(
            'Unable to restore WebSocket constructor.'
          );
          return;
        }
        FTRumWebSocketTracking.installed = false;
        FTRumWebSocketTracking.originalWebSocket = null;
        FTRumWebSocketTracking.instrumentedWebSocket = null;
      } catch {
        // The disabled wrapper remains a passthrough if another library froze it.
        FTRumWebSocketTracking.warnOnce(
          'Unable to restore WebSocket constructor.'
        );
      }
    }
  }

  private static createWebSocket(
    OriginalWebSocket: WebSocketConstructor,
    originalArguments: unknown[],
    newTarget: WebSocketConstructor
  ): WebSocket {
    if (!FTRumWebSocketTracking.enabled) {
      return Reflect.construct(OriginalWebSocket, originalArguments, newTarget);
    }

    const resourceReporter = FTRumWebSocketTracking.resourceReporter;
    if (!resourceReporter) {
      return Reflect.construct(OriginalWebSocket, originalArguments, newTarget);
    }

    // Leave coercion and validation of nonstandard arguments to the constructor.
    const url = originalArguments[0];
    if (typeof url !== 'string') {
      return Reflect.construct(OriginalWebSocket, originalArguments, newTarget);
    }
    const runtimeGlobal = globalThis as RuntimeGlobal;
    if (
      runtimeGlobal.__DEV__ === true &&
      REACT_NATIVE_DEV_WEBSOCKET.test(url)
    ) {
      return Reflect.construct(OriginalWebSocket, originalArguments, newTarget);
    }

    const options = originalArguments[2];
    if (
      options !== undefined &&
      (!options || typeof options !== 'object' || Array.isArray(options))
    ) {
      return Reflect.construct(OriginalWebSocket, originalArguments, newTarget);
    }
    const lifecycleVersion = FTRumWebSocketTracking.lifecycleVersion;
    let resourceKey: string;
    let traceKey: string | undefined;
    let argumentsWithHeaders: unknown[];
    let requestHeaders: Record<string, unknown>;
    try {
      resourceKey = FTRumWebSocketTracking.createResourceKey();
      // Generation may cache correlation before the bridge returns or throws.
      if (FTRumWebSocketTracking.nativeAutoTraceEnabled) traceKey = resourceKey;
      const traceHeaders = traceKey
        ? FTRumWebSocketTracking.getTraceHeaders(url, traceKey)
        : {};
      ({ argumentsWithHeaders, requestHeaders } =
        FTRumWebSocketTracking.mergeTraceHeaders(
          originalArguments,
          traceHeaders
        ));
    } catch {
      FTRumWebSocketTracking.cancelTrace(traceKey);
      FTRumWebSocketTracking.warnOnce('Unable to prepare WebSocket tracking.');
      return Reflect.construct(OriginalWebSocket, originalArguments, newTarget);
    }

    const stopTiming = startWebSocketTiming();
    let socket: WebSocket;
    let completed = false;
    let cancelled = false;
    let pendingCloseError: WebSocketHandshakeError | undefined;
    let startPromise: Promise<boolean> | undefined;
    // Decide once before reporting. Never switch routes after an ambiguous
    // native result: start/add may already have reached the SDK.
    const nativeSession = FTRumWebSocketTracking.nativeSession;
    let nativeResourceStarted = false;
    const removeListeners = (keepFailureClose = false) => {
      completed = true;
      if (!keepFailureClose) {
        pendingCloseError = undefined;
        FTRumWebSocketTracking.pendingHandshakes.delete(cancelHandshake);
      }
      // Cleanup failures must neither interrupt business dispatch nor skip the
      // other listeners. Completed guards also protect callbacks already queued.
      const removers = keepFailureClose
        ? listenerRemovers.slice(0, 2)
        : listenerRemovers;
      for (const remove of removers) {
        try {
          remove();
        } catch {
          FTRumWebSocketTracking.warnOnce(
            'Unable to remove WebSocket listener.'
          );
        }
      }
    };
    const releaseNativeResource = () => {
      if (nativeResourceStarted) {
        nativeResourceStarted = false;
        nativeSession?.release(resourceKey);
      }
    };
    const cancelHandshake = () => {
      cancelled = true;
      removeListeners();
      releaseNativeResource();
    };
    const beginResource = () => {
      if (!startPromise) {
        nativeResourceStarted = nativeSession !== undefined;
        const start = () =>
          nativeSession
            ? nativeSession.startResource(
                resourceKey,
                webSocketNativeID(socket),
                url
              )
            : resourceReporter.startResource(resourceKey);
        startPromise = FTRumWebSocketTracking.startResource(start).catch(() => {
          cancelHandshake();
          if (lifecycleVersion === FTRumWebSocketTracking.lifecycleVersion) {
            FTRumWebSocketTracking.warnOnce(
              'Unable to start WebSocket resource.'
            );
          }
          return false;
        });
      }
      return startPromise;
    };
    const complete = (
      resourceStatus: number,
      state: WebSocketHandshakeState,
      getError?: () => WebSocketHandshakeError,
      event: 'open' | 'error' | 'close' = 'error',
      supplementFailureClose = false
    ) => {
      if (completed) {
        return;
      }
      completed = true;
      const duration = stopTiming();
      // Freeze the observed boundary before inspecting or parsing error data.
      const error = getError?.();
      if (
        cancelled ||
        lifecycleVersion !== FTRumWebSocketTracking.lifecycleVersion
      ) {
        removeListeners();
        return;
      }
      let errorReady: Promise<void> | undefined;
      if (supplementFailureClose && error && !error.message) {
        // RN's built-in EventTarget emits error without message, immediately
        // followed by close(1006, nativeErrorMessage) in the same native-event
        // callback. This also covers RN 0.79's opt-in implementation without
        // guessing behavior from a version number. Freeze time and stop now;
        // allow only that synchronous close to supplement the error text.
        pendingCloseError = error;
        removeListeners(true);
        errorReady = Promise.resolve().then(() => removeListeners());
      } else {
        removeListeners();
      }
      const started = beginResource();
      if (nativeSession) {
        // Invoke stop at the event boundary, without waiting for the start
        // promise or business callbacks. The native module processes in order.
        void FTRumWebSocketTracking.completeNativeResource(
          nativeSession,
          lifecycleVersion,
          resourceKey,
          started,
          {
            url,
            httpMethod: 'GET',
            requestHeader: requestHeaders,
            webSocketEvent: event,
          },
          duration,
          error,
          errorReady
        );
        return;
      }
      void FTRumWebSocketTracking.completeResource(
        resourceReporter,
        lifecycleVersion,
        resourceKey,
        started,
        url,
        requestHeaders,
        resourceStatus,
        state,
        duration,
        error,
        errorReady
      );
    };
    const onOpen = () => complete(0, 'success', undefined, 'open');
    const onError = (event: Event) => {
      complete(
        0,
        'failed',
        () => FTRumWebSocketTracking.handshakeErrorFromEvent(event),
        'error',
        true
      );
    };
    const onClose = (event: Event) => {
      if (pendingCloseError) {
        const error = pendingCloseError;
        const message = FTRumWebSocketTracking.failureMessageFromClose(event);
        // Accessors can reenter shutdown. Do not restore a cancelled error.
        if (pendingCloseError === error) error.message = message;
        removeListeners();
        return;
      }
      // A standalone close is only a terminal signal. Never interpret its
      // business code/reason as a network error or as an HTTP response.
      complete(0, 'failed', undefined, 'close');
    };
    const listenerRemovers = [
      () => socket?.removeEventListener('open', onOpen),
      () => socket?.removeEventListener('error', onError),
      () => socket?.removeEventListener('close', onClose),
    ];

    try {
      socket = Reflect.construct(
        OriginalWebSocket,
        argumentsWithHeaders,
        newTarget
      );
    } catch (error) {
      complete(0, 'failed', () =>
        FTRumWebSocketTracking.toHandshakeError(error)
      );
      throw error;
    }

    try {
      socket.addEventListener('open', onOpen);
      socket.addEventListener('error', onError);
      socket.addEventListener('close', onClose);
      if (!completed) {
        FTRumWebSocketTracking.pendingHandshakes.add(cancelHandshake);
        // Do not leave a native Resource behind if listener installation fails.
        beginResource();
      }
    } catch {
      cancelHandshake();
      // A reentrant terminal may already have started normal Resource reporting.
      if (!startPromise) FTRumWebSocketTracking.cancelTrace(traceKey);
      FTRumWebSocketTracking.warnOnce('Unable to observe WebSocket events.');
    }
    return socket;
  }

  private static createResourceKey(): string {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
      const randomNibble = Math.floor(Math.random() * 16);
      const uuidNibble = token === 'x' ? randomNibble : (randomNibble % 4) + 8;
      return uuidNibble.toString(16);
    });
  }

  private static cancelTrace(key: string | undefined): void {
    if (!key) return;
    try {
      // Older native binaries do not expose this optional cancellation bridge.
      if (
        typeof NativeFTReactNativeTrace?.cancelWebSocketTrace === 'function'
      ) {
        void Promise.resolve(
          NativeFTReactNativeTrace.cancelWebSocketTrace(key)
        ).catch(() => {});
      }
    } catch {
      // Cleanup must never interrupt the business constructor or its exception.
    }
  }

  private static getTraceHeaders(
    url: string,
    resourceKey: string
  ): Record<string, unknown> {
    try {
      const headers = NativeFTReactNativeTrace?.getTraceHeaderFieldsSync(
        url,
        resourceKey
      );
      return FTRumWebSocketTracking.toHeaderRecord(headers);
    } catch {
      FTRumWebSocketTracking.warnOnce(
        'Unable to inject WebSocket trace headers.'
      );
      return {};
    }
  }

  private static mergeTraceHeaders(
    originalArguments: unknown[],
    traceHeaders: Record<string, unknown>
  ): {
    argumentsWithHeaders: unknown[];
    requestHeaders: Record<string, unknown>;
  } {
    const options = FTRumWebSocketTracking.toOptions(originalArguments[2]);
    const requestHeaders = {
      ...FTRumWebSocketTracking.toHeaderRecord(options.headers),
    };
    const traceHeaderEntries = Object.entries(traceHeaders);

    if (traceHeaderEntries.length === 0) {
      return {
        argumentsWithHeaders: originalArguments,
        requestHeaders,
      };
    }

    const traceHeaderNames = new Set(
      traceHeaderEntries.map(([key]) => key.toLowerCase())
    );
    Object.keys(requestHeaders).forEach((key) => {
      if (traceHeaderNames.has(key.toLowerCase())) {
        delete requestHeaders[key];
      }
    });
    traceHeaderEntries.forEach(([key, value]) => {
      requestHeaders[key] = value;
    });

    const argumentsWithHeaders = [...originalArguments];
    // Read a headers accessor only once. Spreading options here would read it
    // again before replacing it with the already captured header values.
    const optionDescriptors = Object.getOwnPropertyDescriptors(options);
    optionDescriptors.headers = {
      configurable: true,
      enumerable: true,
      writable: true,
      value: requestHeaders,
    };
    argumentsWithHeaders[2] = Object.defineProperties({}, optionDescriptors);
    return { argumentsWithHeaders, requestHeaders };
  }

  private static toOptions(value: unknown): ReactNativeWebSocketOptions {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as ReactNativeWebSocketOptions;
    }
    return {};
  }

  private static toHeaderRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private static eventString(
    event: unknown,
    property: string
  ): string | undefined {
    if (!event || typeof event !== 'object') {
      return undefined;
    }
    try {
      const value = (event as Record<string, unknown>)[property];
      return typeof value === 'string' && value.length > 0 ? value : undefined;
    } catch {
      return undefined;
    }
  }

  private static handshakeErrorFromEvent(
    event: Event
  ): WebSocketHandshakeError {
    return { message: FTRumWebSocketTracking.eventString(event, 'message') };
  }

  private static failureMessageFromClose(event: Event): string | undefined {
    try {
      if ((event as Event & { code?: unknown })?.code === 1006) {
        return FTRumWebSocketTracking.eventString(event, 'reason');
      }
    } catch {
      // Optional event details must never interrupt business event dispatch.
    }
    return undefined;
  }

  private static statusFromError(
    message: string | undefined
  ): number | undefined {
    const match =
      message && message.length <= MAX_HTTP_ERROR_PARSE_LENGTH
        ? SOCKET_ROCKET_HTTP_ERROR.exec(message.trim())
        : null;
    return match ? Number(match[1]) : undefined;
  }

  private static toHandshakeError(error: unknown): WebSocketHandshakeError {
    try {
      return {
        message:
          error instanceof Error ? error.message || error.name : String(error),
      };
    } catch {
      return {};
    }
  }

  private static startResource(start: () => Promise<void>): Promise<boolean> {
    try {
      return Promise.resolve(start()).then(() => true);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  private static async completeResource(
    resourceReporter: FTRumWebSocketResourceReporter,
    lifecycleVersion: number,
    resourceKey: string,
    startPromise: Promise<boolean>,
    url: string,
    requestHeader: Record<string, unknown>,
    resourceStatus: number,
    webSocketHandshakeState: WebSocketHandshakeState,
    duration: number | undefined,
    error?: WebSocketHandshakeError,
    errorReady?: Promise<void>
  ): Promise<void> {
    const isCurrentLifecycle = () =>
      lifecycleVersion === FTRumWebSocketTracking.lifecycleVersion;
    try {
      if (!(await startPromise) || !isCurrentLifecycle()) {
        return;
      }
      try {
        await resourceReporter.stopResource(resourceKey);
      } catch {
        // addResource completes the native Resource. Attempt it even if stop
        // failed, but never retry addResource and risk duplicate completion.
        if (isCurrentLifecycle()) {
          FTRumWebSocketTracking.warnOnce('Unable to stop WebSocket resource.');
        }
      }
      if (errorReady) await errorReady;
      // Only old native binaries classify in JS. Resolve supplemental text
      // before normalization; duration was frozen at the first terminal event.
      const httpStatus = FTRumWebSocketTracking.statusFromError(error?.message);
      if (httpStatus !== undefined && webSocketHandshakeState !== 'success') {
        resourceStatus = httpStatus;
        webSocketHandshakeState = httpStatus !== 101 ? 'rejected' : 'failed';
      }
      const resource: FTRUMWebSocketResource = {
        url,
        httpMethod: 'GET',
        requestHeader,
        resourceStatus,
        resourceType: 'websocket',
        webSocketHandshake: true,
        webSocketHandshakeState,
      };
      if (error?.message) resource.errorMessage = error.message;
      const metrics: { duration?: number } = {};
      if (duration !== undefined) metrics.duration = duration;
      if (isCurrentLifecycle()) {
        await resourceReporter.addResource(
          resourceKey,
          resource,
          Object.keys(metrics).length ? metrics : undefined
        );
      }
    } catch {
      if (isCurrentLifecycle()) {
        FTRumWebSocketTracking.warnOnce('Unable to report WebSocket resource.');
      }
    }
  }

  private static async completeNativeResource(
    session: NativeWebSocketSession,
    lifecycleVersion: number,
    key: string,
    started: Promise<boolean>,
    content: NativeWebSocketResource,
    duration: number | undefined,
    error?: WebSocketHandshakeError,
    errorReady?: Promise<void>
  ): Promise<void> {
    // Attach rejection handling immediately, including when start never settles.
    let stopped: Promise<void>;
    try {
      stopped = Promise.resolve(
        session.stopResource(key, content.webSocketEvent)
      ).catch(() => {
        if (lifecycleVersion === FTRumWebSocketTracking.lifecycleVersion)
          FTRumWebSocketTracking.warnOnce('Unable to stop WebSocket resource.');
      });
    } catch {
      stopped = Promise.resolve();
    }
    try {
      if (!(await started)) return;
      await stopped;
      if (errorReady) await errorReady;
      if (lifecycleVersion !== FTRumWebSocketTracking.lifecycleVersion) return;
      await session.addResource(
        key,
        error?.message ? { ...content, errorMessage: error.message } : content,
        duration === undefined ? {} : { duration }
      );
    } catch {
      session.release(key);
      if (lifecycleVersion === FTRumWebSocketTracking.lifecycleVersion)
        FTRumWebSocketTracking.warnOnce('Unable to report WebSocket resource.');
    }
  }

  private static warnOnce(message: string): void {
    if (FTRumWebSocketTracking.warnedFailures.has(message)) {
      return;
    }
    FTRumWebSocketTracking.warnedFailures.add(message);
    try {
      console.warn(`[FT-SDK] ${message}`);
    } catch {
      // A host-provided logger must not turn instrumentation failure into one
      // on the application's constructor, event dispatch or promise chain.
    }
  }
}
