/* global WebSocket */
const mockPlatform = { OS: 'ios' };
const mockStartResource = jest.fn().mockResolvedValue(undefined);
const mockStopResource = jest.fn().mockResolvedValue(undefined);
const mockAddResource = jest.fn().mockResolvedValue(undefined);
const mockGetTraceHeaderFieldsSync = jest.fn(() => ({
  traceparent: 'sdk-trace-header',
}));

jest.mock('react-native', () => ({
  Platform: mockPlatform,
}));

jest.mock('../specs/NativeFTReactNativeTrace', () => ({
  __esModule: true,
  default: {
    getTraceHeaderFieldsSync: mockGetTraceHeaderFieldsSync,
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FTRumWebSocketTracking } = require('../rum/FTRumWebSocketTracking');

type Listener = (event: Record<string, unknown>) => void;

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readonly constructorArguments: unknown[];
  readonly listeners: Record<string, Listener[]> = {};
  onopen: Listener | null = null;
  onerror: Listener | null = null;
  onclose: Listener | null = null;
  send = jest.fn();
  close = jest.fn();

  constructor(...args: unknown[]) {
    if (args[0] === 'wss://throw.example') {
      throw new Error('constructor failed');
    }
    this.constructorArguments = args;
    MockWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: Listener): void {
    this.listeners[type] = this.listeners[type] || [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners[type] = (this.listeners[type] || []).filter(
      (current) => current !== listener
    );
  }

  emit(
    type: 'open' | 'error' | 'close',
    event: Record<string, unknown> = {}
  ): void {
    const emittedEvent = { type, ...event };
    [...(this.listeners[type] || [])].forEach((listener) =>
      listener(emittedEvent)
    );
    const handler = this[`on${type}`];
    if (handler) {
      handler(emittedEvent);
    }
  }
}

const flushResourceReport = () =>
  new Promise<void>((resolve) => setImmediate(resolve));

const resourceReporter = {
  startResource: mockStartResource,
  stopResource: mockStopResource,
  addResource: mockAddResource,
};

describe('FTRumWebSocketTracking', () => {
  const runtimeGlobal = globalThis as typeof globalThis & {
    WebSocket: typeof WebSocket;
    __DEV__?: boolean;
  };
  const defaultWebSocket = runtimeGlobal.WebSocket;

  beforeEach(() => {
    FTRumWebSocketTracking.stopTracking();
    FTRumWebSocketTracking.setNativeAutoTraceEnabled(true);
    mockPlatform.OS = 'ios';
    MockWebSocket.instances = [];
    runtimeGlobal.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    runtimeGlobal.__DEV__ = false;
    jest.clearAllMocks();
    mockStartResource.mockResolvedValue(undefined);
    mockStopResource.mockResolvedValue(undefined);
    mockAddResource.mockResolvedValue(undefined);
    mockGetTraceHeaderFieldsSync.mockReturnValue({
      traceparent: 'sdk-trace-header',
    });
  });

  afterEach(() => {
    FTRumWebSocketTracking.stopTracking();
    FTRumWebSocketTracking.setNativeAutoTraceEnabled(false);
    delete runtimeGlobal.__DEV__;
  });

  afterAll(() => {
    runtimeGlobal.WebSocket = defaultWebSocket;
  });

  it('injects trace headers and reports a successful opening handshake', async () => {
    FTRumWebSocketTracking.startTracking(resourceReporter);

    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/socket',
      ['json'],
      {
        headers: {
          Authorization: 'token',
          TraceParent: 'application-trace-header',
        },
        handshakeTimeout: 1000,
      }
    ) as unknown as MockWebSocket;
    const applicationOnOpen = jest.fn();
    socket.onopen = applicationOnOpen;

    const resourceKey = mockStartResource.mock.calls[0][0];
    expect(resourceKey).toMatch(/^[0-9a-f]{12}4[0-9a-f]{3}[89ab][0-9a-f]{15}$/);
    expect(mockGetTraceHeaderFieldsSync).toHaveBeenCalledWith(
      'wss://example.com/socket',
      resourceKey
    );
    expect(socket).toBeInstanceOf(MockWebSocket);
    expect(runtimeGlobal.WebSocket.OPEN).toBe(MockWebSocket.OPEN);
    expect(socket.constructorArguments).toEqual([
      'wss://example.com/socket',
      ['json'],
      {
        headers: {
          Authorization: 'token',
          traceparent: 'sdk-trace-header',
        },
        handshakeTimeout: 1000,
      },
    ]);

    socket.emit('open');
    await flushResourceReport();

    expect(applicationOnOpen).toHaveBeenCalledTimes(1);
    expect(mockStopResource).toHaveBeenCalledWith(resourceKey);
    expect(mockAddResource).toHaveBeenCalledWith(resourceKey, {
      url: 'wss://example.com/socket',
      httpMethod: 'GET',
      requestHeader: {
        Authorization: 'token',
        traceparent: 'sdk-trace-header',
      },
      resourceStatus: 101,
      resourceType: 'websocket',
      webSocketHandshake: true,
      webSocketHandshakeState: 'success',
    });
  });

  it('collects the Resource without trace headers when native auto trace is disabled', async () => {
    FTRumWebSocketTracking.setNativeAutoTraceEnabled(false);
    FTRumWebSocketTracking.startTracking(resourceReporter);

    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/socket'
    ) as unknown as MockWebSocket;
    socket.emit('open');
    await flushResourceReport();

    expect(mockGetTraceHeaderFieldsSync).not.toHaveBeenCalled();
    expect(socket.constructorArguments).toEqual(['wss://example.com/socket']);
    expect(mockAddResource.mock.calls[0][1]).toMatchObject({
      requestHeader: {},
      resourceStatus: 101,
      webSocketHandshakeState: 'success',
    });
  });

  it('reports a failed handshake once when error and close both fire', async () => {
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/failure'
    ) as unknown as MockWebSocket;

    socket.emit('error');
    socket.emit('close', {
      code: 1006,
      reason: 'The Internet connection appears to be offline.',
    });
    await flushResourceReport();

    expect(mockStopResource).toHaveBeenCalledTimes(1);
    expect(mockAddResource).toHaveBeenCalledTimes(1);
    expect(mockAddResource.mock.calls[0][1]).toMatchObject({
      resourceStatus: 0,
      webSocketHandshakeState: 'failed',
      errorCode: 1006,
      errorMessage: 'The Internet connection appears to be offline.',
    });
  });

  it('reports an error event message when close does not fire', async () => {
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/failure'
    ) as unknown as MockWebSocket;

    socket.emit('error', { message: 'Connection failed before close.' });
    await flushResourceReport();

    expect(mockAddResource.mock.calls[0][1]).toMatchObject({
      resourceStatus: 0,
      webSocketHandshakeState: 'failed',
      errorMessage: 'Connection failed before close.',
    });
  });

  it('does not extend a successful Resource until socket close', async () => {
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/socket'
    ) as unknown as MockWebSocket;

    socket.emit('open');
    socket.emit('close');
    await flushResourceReport();

    expect(mockStopResource).toHaveBeenCalledTimes(1);
    expect(mockAddResource).toHaveBeenCalledTimes(1);
  });

  it('reports constructor failures and preserves the original exception', async () => {
    FTRumWebSocketTracking.startTracking(resourceReporter);

    expect(() => new runtimeGlobal.WebSocket('wss://throw.example')).toThrow(
      'constructor failed'
    );
    await flushResourceReport();

    expect(mockAddResource.mock.calls[0][1]).toMatchObject({
      resourceStatus: 0,
      webSocketHandshakeState: 'failed',
      errorMessage: 'constructor failed',
    });
  });

  it('is idempotent when tracking is started repeatedly', () => {
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const instrumentedWebSocket = runtimeGlobal.WebSocket;
    FTRumWebSocketTracking.startTracking(resourceReporter);

    expect(runtimeGlobal.WebSocket).toBe(instrumentedWebSocket);
    new runtimeGlobal.WebSocket('wss://example.com/socket');
    expect(mockStartResource).toHaveBeenCalledTimes(1);
  });

  it('preserves WebSocket subclass construction semantics', () => {
    FTRumWebSocketTracking.startTracking(resourceReporter);

    class CustomerWebSocket extends runtimeGlobal.WebSocket {
      customerMethod(): string {
        return 'customer';
      }
    }

    const socket = new CustomerWebSocket('wss://example.com/socket');

    expect(socket).toBeInstanceOf(CustomerWebSocket);
    expect(socket).toBeInstanceOf(MockWebSocket);
    expect(socket.constructor).toBe(CustomerWebSocket);
    expect(socket.customerMethod()).toBe('customer');
  });

  it('restores the original constructor when tracking stops', () => {
    const originalWebSocket = runtimeGlobal.WebSocket;
    FTRumWebSocketTracking.startTracking(resourceReporter);
    FTRumWebSocketTracking.stopTracking();

    expect(runtimeGlobal.WebSocket).toBe(originalWebSocket);
    new runtimeGlobal.WebSocket('wss://example.com/socket');
    expect(mockStartResource).not.toHaveBeenCalled();
  });

  it('completes an in-flight handshake with its captured reporter after tracking stops', async () => {
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/socket'
    ) as unknown as MockWebSocket;

    FTRumWebSocketTracking.stopTracking();
    socket.emit('open');
    await flushResourceReport();

    expect(mockStopResource).toHaveBeenCalledTimes(1);
    expect(mockAddResource).toHaveBeenCalledTimes(1);
  });

  it('does not install on Android', () => {
    mockPlatform.OS = 'android';
    const originalWebSocket = runtimeGlobal.WebSocket;

    FTRumWebSocketTracking.startTracking(resourceReporter);

    expect(runtimeGlobal.WebSocket).toBe(originalWebSocket);
    new runtimeGlobal.WebSocket('wss://example.com/socket');
    expect(mockStartResource).not.toHaveBeenCalled();
  });

  it.each([
    'ws://localhost:8081/hot',
    'ws://192.168.1.20:8081/inspector/device?name=iPhone',
    'ws://127.0.0.1:8088/debugger-proxy?role=client',
  ])('ignores React Native development WebSocket %s', (url) => {
    runtimeGlobal.__DEV__ = true;
    FTRumWebSocketTracking.startTracking(resourceReporter);

    new runtimeGlobal.WebSocket(url);

    expect(mockGetTraceHeaderFieldsSync).not.toHaveBeenCalled();
    expect(mockStartResource).not.toHaveBeenCalled();
  });

  it('continues connecting and collecting when trace injection fails', async () => {
    const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    mockGetTraceHeaderFieldsSync.mockImplementation(() => {
      throw new Error('synchronous methods unavailable');
    });
    FTRumWebSocketTracking.startTracking(resourceReporter);

    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/socket'
    ) as unknown as MockWebSocket;
    socket.emit('open');
    await flushResourceReport();

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(mockAddResource).toHaveBeenCalledTimes(1);
    expect(consoleWarn).toHaveBeenCalledTimes(1);
    consoleWarn.mockRestore();
  });
});
