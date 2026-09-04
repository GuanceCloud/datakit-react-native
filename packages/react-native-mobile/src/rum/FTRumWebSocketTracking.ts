/* global WebSocket */
import { Platform } from 'react-native';
import type { FTRUMResource } from '../ft_rum';
import { FTReactNativeRUM } from '../ft_rum';
import NativeFTReactNativeTrace from '../specs/NativeFTReactNativeTrace';

type WebSocketConstructor = typeof WebSocket;
type WebSocketHandshakeState = 'success' | 'failed';

interface ReactNativeWebSocketOptions {
  headers?: Record<string, unknown>;
  [key: string]: unknown;
}

interface FTRUMWebSocketResource extends FTRUMResource {
  resourceType: 'websocket';
  webSocketHandshake: true;
  webSocketHandshakeState: WebSocketHandshakeState;
  errorMessage?: string;
  errorCode?: number;
}

interface WebSocketHandshakeError {
  message?: string;
  code?: number;
}

type RuntimeGlobal = typeof globalThis & {
  WebSocket: WebSocketConstructor;
  __DEV__?: boolean;
};

const REACT_NATIVE_DEV_WEBSOCKET =
  /^wss?:\/\/(?:(?:10|172|192)\.[0-9]+\.[0-9]+\.[0-9]+|localhost|127\.0\.0\.1|\[::1\]):808[0-9]\/(?:hot|symbolicate|message|inspector|status|assets|logs)(?:[/?#].*)?$/i;

export class FTRumWebSocketTracking {
  private static enabled = false;
  private static installed = false;
  private static originalWebSocket: WebSocketConstructor | null = null;
  private static instrumentedWebSocket: WebSocketConstructor | null = null;
  private static didWarnTraceFailure = false;

  static startTracking(): void {
    if (Platform.OS !== 'ios') {
      return;
    }

    FTRumWebSocketTracking.enabled = true;
    if (FTRumWebSocketTracking.installed) {
      return;
    }

    const runtimeGlobal = globalThis as RuntimeGlobal;
    const originalWebSocket = runtimeGlobal.WebSocket;
    if (typeof originalWebSocket !== 'function') {
      return;
    }

    const InstrumentedWebSocket = function (
      this: WebSocket,
      ...args: unknown[]
    ): WebSocket {
      if (!new.target) {
        return Reflect.apply(originalWebSocket, this, args);
      }
      return FTRumWebSocketTracking.createWebSocket(originalWebSocket, args);
    } as unknown as WebSocketConstructor;

    InstrumentedWebSocket.prototype = originalWebSocket.prototype;
    Object.setPrototypeOf(InstrumentedWebSocket, originalWebSocket);

    FTRumWebSocketTracking.originalWebSocket = originalWebSocket;
    FTRumWebSocketTracking.instrumentedWebSocket = InstrumentedWebSocket;
    FTRumWebSocketTracking.installed = true;
    runtimeGlobal.WebSocket = InstrumentedWebSocket;
  }

  static stopTracking(): void {
    FTRumWebSocketTracking.enabled = false;
    if (!FTRumWebSocketTracking.installed) {
      return;
    }

    const runtimeGlobal = globalThis as RuntimeGlobal;
    if (
      runtimeGlobal.WebSocket ===
        FTRumWebSocketTracking.instrumentedWebSocket &&
      FTRumWebSocketTracking.originalWebSocket
    ) {
      runtimeGlobal.WebSocket = FTRumWebSocketTracking.originalWebSocket;
      FTRumWebSocketTracking.installed = false;
      FTRumWebSocketTracking.originalWebSocket = null;
      FTRumWebSocketTracking.instrumentedWebSocket = null;
    }
  }

  private static createWebSocket(
    OriginalWebSocket: WebSocketConstructor,
    originalArguments: unknown[]
  ): WebSocket {
    if (!FTRumWebSocketTracking.enabled) {
      return Reflect.construct(OriginalWebSocket, originalArguments);
    }

    const url = String(originalArguments[0]);
    const runtimeGlobal = globalThis as RuntimeGlobal;
    if (
      runtimeGlobal.__DEV__ === true &&
      REACT_NATIVE_DEV_WEBSOCKET.test(url)
    ) {
      return Reflect.construct(OriginalWebSocket, originalArguments);
    }

    const resourceKey = FTRumWebSocketTracking.createResourceKey();
    const traceHeaders = FTRumWebSocketTracking.getTraceHeaders(
      url,
      resourceKey
    );
    const { argumentsWithHeaders, requestHeaders } =
      FTRumWebSocketTracking.mergeTraceHeaders(originalArguments, traceHeaders);
    const startPromise = FTRumWebSocketTracking.startResource(resourceKey);

    let socket: WebSocket;
    try {
      socket = Reflect.construct(OriginalWebSocket, argumentsWithHeaders);
    } catch (error) {
      FTRumWebSocketTracking.completeResource(
        resourceKey,
        startPromise,
        url,
        requestHeaders,
        0,
        'failed',
        FTRumWebSocketTracking.toHandshakeError(error)
      );
      throw error;
    }

    let completed = false;
    let errorMessage: string | undefined;
    const removeListeners = () => {
      socket.removeEventListener('open', onOpen);
      socket.removeEventListener('error', onError);
      socket.removeEventListener('close', onClose);
    };
    const complete = (
      resourceStatus: number,
      state: WebSocketHandshakeState,
      error?: WebSocketHandshakeError
    ) => {
      if (completed) {
        return;
      }
      completed = true;
      removeListeners();
      FTRumWebSocketTracking.completeResource(
        resourceKey,
        startPromise,
        url,
        requestHeaders,
        resourceStatus,
        state,
        error
      );
    };
    const onOpen = () => complete(101, 'success');
    const onError = (event: Event) => {
      errorMessage = FTRumWebSocketTracking.eventString(event, 'message');

      // React Native dispatches a close event carrying the native error message
      // immediately after the generic error event. Defer the fallback so close
      // can provide its reason while still completing if close never arrives.
      void Promise.resolve().then(() => {
        complete(0, 'failed', { message: errorMessage });
      });
    };
    const onClose = (event: Event) =>
      complete(0, 'failed', {
        message:
          FTRumWebSocketTracking.eventString(event, 'reason') || errorMessage,
        code: FTRumWebSocketTracking.eventNumber(event, 'code'),
      });

    socket.addEventListener('open', onOpen);
    socket.addEventListener('error', onError);
    socket.addEventListener('close', onClose);
    return socket;
  }

  private static createResourceKey(): string {
    return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (token) => {
      const randomNibble = Math.floor(Math.random() * 16);
      const uuidNibble = token === 'x' ? randomNibble : (randomNibble % 4) + 8;
      return uuidNibble.toString(16);
    });
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
    } catch (error) {
      if (!FTRumWebSocketTracking.didWarnTraceFailure) {
        FTRumWebSocketTracking.didWarnTraceFailure = true;
        console.warn(
          '[FT-SDK] Unable to inject React Native WebSocket trace headers.',
          error
        );
      }
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

    traceHeaderEntries.forEach(([traceKey, traceValue]) => {
      const existingKey = Object.keys(requestHeaders).find(
        (key) => key.toLowerCase() === traceKey.toLowerCase()
      );
      if (existingKey) {
        delete requestHeaders[existingKey];
      }
      requestHeaders[traceKey] = traceValue;
    });

    if (traceHeaderEntries.length === 0) {
      return {
        argumentsWithHeaders: originalArguments,
        requestHeaders,
      };
    }

    const argumentsWithHeaders = [...originalArguments];
    argumentsWithHeaders[2] = {
      ...options,
      headers: requestHeaders,
    };
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
    const value = (event as Record<string, unknown>)[property];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private static eventNumber(
    event: unknown,
    property: string
  ): number | undefined {
    if (!event || typeof event !== 'object') {
      return undefined;
    }
    const value = (event as Record<string, unknown>)[property];
    return typeof value === 'number' && Number.isFinite(value)
      ? value
      : undefined;
  }

  private static toHandshakeError(error: unknown): WebSocketHandshakeError {
    if (error instanceof Error) {
      return {
        message: error.message || error.name,
        code: FTRumWebSocketTracking.eventNumber(error, 'code'),
      };
    }
    return { message: String(error) };
  }

  private static startResource(resourceKey: string): Promise<void> {
    try {
      return Promise.resolve(FTReactNativeRUM.startResource(resourceKey));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  private static completeResource(
    resourceKey: string,
    startPromise: Promise<void>,
    url: string,
    requestHeader: Record<string, unknown>,
    resourceStatus: number,
    webSocketHandshakeState: WebSocketHandshakeState,
    error?: WebSocketHandshakeError
  ): void {
    const resource: FTRUMWebSocketResource = {
      url,
      httpMethod: 'GET',
      requestHeader,
      resourceStatus,
      resourceType: 'websocket',
      webSocketHandshake: true,
      webSocketHandshakeState,
    };
    if (error?.message) {
      resource.errorMessage = error.message;
    }
    if (error?.code !== undefined) {
      resource.errorCode = error.code;
    }

    void startPromise
      .catch(() => undefined)
      .then(() => FTReactNativeRUM.stopResource(resourceKey))
      .then(() => FTReactNativeRUM.addResource(resourceKey, resource))
      .catch((error) => {
        console.warn(
          '[FT-SDK] Unable to report React Native WebSocket resource.',
          error
        );
      });
  }
}
