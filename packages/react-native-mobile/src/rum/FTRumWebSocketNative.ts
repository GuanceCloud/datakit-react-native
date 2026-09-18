import NativeWebSocket from '../specs/NativeFTReactNativeWebSocket';
import { bridgeContextManager } from '../ft_mobile_agent';

export interface NativeWebSocketResource {
  url: string;
  httpMethod: string;
  requestHeader: Record<string, unknown>;
  webSocketEvent: string;
  errorMessage?: string;
}

function ignoreBridgeFailure(call: () => unknown): void {
  try {
    void Promise.resolve(call()).catch(() => {});
  } catch {
    /* Setup/cleanup replies must not interrupt JS capture. */
  }
}

export class NativeWebSocketSession {
  private stopped = false;
  private sequence = 0;

  constructor(private readonly session: string) {
    // Enqueue setup before start/stop/add on the same native module queue.
    // Its reply never gates JS capture or selects a different reporting route.
    ignoreBridgeFailure(() => NativeWebSocket!.startCapture(session));
  }

  startResource(
    key: string,
    socketID: number | undefined,
    url: string
  ): Promise<void> {
    const property = bridgeContextManager.mergeWithLocalPropertiesSync();
    return NativeWebSocket!.startResource(
      key,
      socketID ?? -1,
      url,
      this.session,
      ++this.sequence,
      property
    );
  }

  stopResource(key: string, event: string): Promise<void> {
    const property = bridgeContextManager.mergeWithLocalPropertiesSync();
    return NativeWebSocket!.stopResource(key, event, this.session, property);
  }

  addResource(
    key: string,
    content: NativeWebSocketResource,
    metrics: { duration?: number }
  ): Promise<void> {
    return NativeWebSocket!.addResource(key, content, metrics, this.session);
  }

  release(key: string): void {
    ignoreBridgeFailure(() =>
      NativeWebSocket?.releaseResource(key, this.session)
    );
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    // Existing handshakes still finish through their originally selected route.
    ignoreBridgeFailure(() => NativeWebSocket?.stopCapture(this.session));
  }
}

export function startNativeWebSocketSession(
  createKey: () => string
): NativeWebSocketSession | undefined {
  try {
    if (
      typeof NativeWebSocket?.startCapture === 'function' &&
      typeof NativeWebSocket.stopCapture === 'function' &&
      typeof NativeWebSocket.clear === 'function' &&
      typeof NativeWebSocket.startResource === 'function' &&
      typeof NativeWebSocket.stopResource === 'function' &&
      typeof NativeWebSocket.addResource === 'function' &&
      typeof NativeWebSocket.releaseResource === 'function'
    )
      return new NativeWebSocketSession(createKey());
  } catch {
    /* Old native binaries keep the JS fallback. */
  }
  return undefined;
}

export function clearNativeWebSocketSessions(): void {
  ignoreBridgeFailure(() => NativeWebSocket?.clear());
}

export function webSocketNativeID(socket: unknown): number | undefined {
  try {
    const id = (socket as { _socketId?: unknown })?._socketId;
    return typeof id === 'number' && Number.isSafeInteger(id) && id >= 0
      ? id
      : undefined;
  } catch {
    return undefined;
  }
}
