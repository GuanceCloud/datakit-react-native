/* global WebSocket */
const mockPlatform = { OS: 'ios' };
const mockStartResource = jest.fn().mockResolvedValue(undefined);
const mockStopResource = jest.fn().mockResolvedValue(undefined);
const mockAddResource = jest.fn().mockResolvedValue(undefined);
const mockNativeShutdown = jest.fn().mockResolvedValue(undefined);
const mockStopLongTaskTracking = jest.fn().mockResolvedValue(undefined);
const mockGetTraceHeaderFieldsSync = jest.fn(
  (_url?: string, _key?: string) => ({
    traceparent: 'sdk-trace-header',
  })
);
const mockCancelWebSocketTrace = jest.fn().mockResolvedValue(undefined);
const mockTrace = {
  getTraceHeaderFieldsSync: mockGetTraceHeaderFieldsSync,
  cancelWebSocketTrace: mockCancelWebSocketTrace,
};

let mockNativeBridgeAvailable = false;
const mockMetadata = {
  startCapture: jest.fn().mockResolvedValue(true),
  stopCapture: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  releaseResource: jest.fn().mockResolvedValue(undefined),
  startResource: jest.fn().mockResolvedValue(undefined),
  stopResource: jest.fn().mockResolvedValue(undefined),
  addResource: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../specs/NativeFTReactNativeWebSocket', () => ({
  __esModule: true,
  get default() {
    return mockNativeBridgeAvailable ? mockMetadata : undefined;
  },
}));

jest.mock('react-native', () => ({
  Platform: mockPlatform,
}));

jest.mock('../specs/NativeFTReactNativeTrace', () => ({
  __esModule: true,
  default: mockTrace,
}));

jest.mock('../specs/NativeFTMobileReactNative', () => ({
  __esModule: true,
  default: { shutDown: mockNativeShutdown },
}));

jest.mock('../specs/NativeFTReactNativeRUM', () => ({
  __esModule: true,
  default: { stopLongTaskTracking: mockStopLongTaskTracking },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FTRumWebSocketTracking } = require('../rum/FTRumWebSocketTracking');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FTMobileReactNative } = require('../ft_mobile_agent');

type Listener = (event: Record<string, unknown>) => void;

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  readonly _socketId = MockWebSocket.instances.length;
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

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('FTRumWebSocketTracking', () => {
  const runtimeGlobal = globalThis as typeof globalThis & {
    WebSocket: typeof WebSocket;
    __DEV__?: boolean;
  };
  const defaultWebSocket = runtimeGlobal.WebSocket;
  const defaultPerformanceDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'performance'
  );
  const setPerformanceClock = (now: () => number) => {
    Object.defineProperty(globalThis, 'performance', {
      configurable: true,
      value: { now },
    });
  };

  beforeEach(() => {
    FTRumWebSocketTracking.stopTracking();
    FTRumWebSocketTracking.setNativeAutoTraceEnabled(true);
    mockPlatform.OS = 'ios';
    mockNativeBridgeAvailable = false;
    MockWebSocket.instances = [];
    runtimeGlobal.WebSocket = MockWebSocket as unknown as typeof WebSocket;
    runtimeGlobal.__DEV__ = false;
    jest.clearAllMocks();
    mockMetadata.startCapture.mockResolvedValue(true);
    mockMetadata.startResource.mockResolvedValue(undefined);
    mockMetadata.stopResource.mockResolvedValue(undefined);
    mockMetadata.addResource.mockResolvedValue(undefined);
    mockStartResource.mockResolvedValue(undefined);
    mockStopResource.mockResolvedValue(undefined);
    mockAddResource.mockResolvedValue(undefined);
    mockGetTraceHeaderFieldsSync.mockReturnValue({
      traceparent: 'sdk-trace-header',
    });
    mockTrace.cancelWebSocketTrace = mockCancelWebSocketTrace;
    mockCancelWebSocketTrace.mockReset().mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await FTMobileReactNative.shutDown();
    FTRumWebSocketTracking.stopTracking();
    FTRumWebSocketTracking.setNativeAutoTraceEnabled(false);
    delete runtimeGlobal.__DEV__;
    jest.restoreAllMocks();
    if (defaultPerformanceDescriptor) {
      Object.defineProperty(
        globalThis,
        'performance',
        defaultPerformanceDescriptor
      );
    } else {
      Reflect.deleteProperty(globalThis, 'performance');
    }
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
    expect(mockAddResource).toHaveBeenCalledWith(
      resourceKey,
      {
        url: 'wss://example.com/socket',
        httpMethod: 'GET',
        requestHeader: {
          Authorization: 'token',
          traceparent: 'sdk-trace-header',
        },
        resourceStatus: 0,
        resourceType: 'websocket',
        webSocketHandshake: true,
        webSocketHandshakeState: 'success',
      },
      { duration: expect.any(Number) }
    );
  });

  it('reports through three WebSocket bridge calls without returning native metadata to JS', async () => {
    let now = 10;
    setPerformanceClock(() => now);
    mockNativeBridgeAvailable = true;
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/socket'
    ) as unknown as MockWebSocket;
    now = 35;
    socket.emit('error', {
      message: 'Received bad response code from server: 403.',
    });
    socket.emit('close');
    await flushResourceReport();
    expect(mockMetadata.startResource).toHaveBeenCalledTimes(1);
    expect(mockMetadata.stopResource).toHaveBeenCalledTimes(1);
    expect(mockMetadata.addResource).toHaveBeenCalledTimes(1);
    expect(mockStartResource).not.toHaveBeenCalled();
    expect(mockStopResource).not.toHaveBeenCalled();
    expect(mockAddResource).not.toHaveBeenCalled();
    expect(mockMetadata.addResource.mock.calls[0][1]).toMatchObject({
      errorMessage: 'Received bad response code from server: 403.',
      webSocketEvent: 'error',
    });
    expect(mockMetadata.addResource.mock.calls[0][1]).not.toHaveProperty(
      'resourceStatus'
    );
    expect(mockMetadata.addResource.mock.calls[0][2]).toEqual({
      duration: 25_000_000,
    });
  });

  it('starts JS capture and native reporting without waiting for the capture reply', async () => {
    mockNativeBridgeAvailable = true;
    const capture = deferred();
    mockMetadata.startCapture.mockReturnValueOnce(capture.promise);
    let now = 10;
    setPerformanceClock(() => now);
    FTRumWebSocketTracking.startTracking(resourceReporter);
    expect(mockMetadata.startCapture).toHaveBeenCalledTimes(1);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/early'
    ) as unknown as MockWebSocket;
    now = 35;
    socket.emit('open');
    await flushResourceReport();
    expect(mockMetadata.startResource).toHaveBeenCalledTimes(1);
    expect(mockMetadata.stopResource).toHaveBeenCalledTimes(1);
    expect(mockMetadata.addResource).toHaveBeenCalledTimes(1);
    expect(mockMetadata.addResource.mock.calls[0][2]).toEqual({
      duration: 25_000_000,
    });
    expect(mockStartResource).not.toHaveBeenCalled();
    expect(mockAddResource).not.toHaveBeenCalled();
    FTRumWebSocketTracking.shutDown();
    capture.resolve();
    await flushResourceReport();
    expect(runtimeGlobal.WebSocket).toBe(MockWebSocket);
    expect(mockMetadata.startCapture).toHaveBeenCalledTimes(1);
  });

  it('stops natively before a delayed start promise and freezes time before business callbacks', async () => {
    let now = 10;
    setPerformanceClock(() => now);
    const start = deferred();
    const stop = deferred();
    mockMetadata.startResource.mockReturnValueOnce(start.promise);
    mockMetadata.stopResource.mockReturnValueOnce(stop.promise);
    mockNativeBridgeAvailable = true;
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/socket'
    ) as unknown as MockWebSocket;
    const key = mockMetadata.startResource.mock.calls[0][0];
    const session = mockMetadata.startCapture.mock.calls[0][0];
    expect(mockMetadata.startResource).toHaveBeenCalledWith(
      key,
      socket._socketId,
      'wss://example.com/socket',
      session,
      1,
      expect.objectContaining({ sdk_bridge_info: expect.any(String) })
    );
    socket.onopen = () => {
      now = 1000;
    };
    now = 35;
    socket.emit('open');
    expect(mockMetadata.stopResource).toHaveBeenCalledWith(
      key,
      'open',
      session,
      expect.objectContaining({ sdk_bridge_info: expect.any(String) })
    );
    expect(mockMetadata.addResource).not.toHaveBeenCalled();
    start.resolve();
    await flushResourceReport();
    expect(mockMetadata.addResource).not.toHaveBeenCalled();
    stop.resolve();
    await flushResourceReport();
    expect(mockMetadata.addResource.mock.calls[0][2]).toEqual({
      duration: 25_000_000,
    });
  });

  it.each(['throw', 'reject'])(
    'releases a native start %s without switching to the RUM bridge',
    async (failure) => {
      mockNativeBridgeAvailable = true;
      FTRumWebSocketTracking.startTracking(resourceReporter);
      mockMetadata.startResource.mockImplementationOnce(() => {
        if (failure === 'throw') throw new Error('start failed');
        return Promise.reject(new Error('start failed'));
      });
      const socket = new runtimeGlobal.WebSocket(
        'wss://example.com/socket'
      ) as unknown as MockWebSocket;
      socket.emit('open');
      await flushResourceReport();
      expect(mockMetadata.releaseResource).toHaveBeenCalledWith(
        mockMetadata.startResource.mock.calls[0][0],
        expect.any(String)
      );
      expect(socket.listeners).toEqual({ open: [], error: [], close: [] });
      expect(mockStartResource).not.toHaveBeenCalled();
      expect(mockMetadata.addResource).not.toHaveBeenCalled();
    }
  );

  it.each(['start', 'stop'])(
    'discards a native terminal after shutdown during delayed %s',
    async (phase) => {
      const pending = deferred();
      mockMetadata[
        phase === 'start' ? 'startResource' : 'stopResource'
      ].mockReturnValueOnce(pending.promise);
      mockNativeBridgeAvailable = true;
      FTRumWebSocketTracking.startTracking(resourceReporter);
      const socket = new runtimeGlobal.WebSocket(
        'wss://example.com/socket'
      ) as unknown as MockWebSocket;
      socket.emit('open');
      await FTMobileReactNative.shutDown();
      pending.resolve();
      await flushResourceReport();
      expect(mockMetadata.clear).toHaveBeenCalled();
      expect(mockMetadata.addResource).not.toHaveBeenCalled();
      expect(mockAddResource).not.toHaveBeenCalled();
    }
  );

  it('stops new capture while allowing a started native handshake to finish', async () => {
    mockNativeBridgeAvailable = true;
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/socket'
    ) as unknown as MockWebSocket;
    FTRumWebSocketTracking.stopTracking();
    socket.emit('open');
    await flushResourceReport();
    expect(mockMetadata.stopCapture).toHaveBeenCalledTimes(1);
    expect(mockMetadata.addResource).toHaveBeenCalledTimes(1);
    expect(mockAddResource).not.toHaveBeenCalled();
  });

  it.each(['throw', 'reject'])(
    'finishes once after a native stop %s and never retries add',
    async (failure) => {
      mockNativeBridgeAvailable = true;
      FTRumWebSocketTracking.startTracking(resourceReporter);
      const fail = () => {
        if (failure === 'throw') throw new Error('bridge');
        return Promise.reject(new Error('bridge'));
      };
      mockMetadata.stopResource.mockImplementationOnce(fail);
      mockMetadata.addResource.mockImplementationOnce(fail);
      const socket = new runtimeGlobal.WebSocket(
        'wss://example.com/socket'
      ) as unknown as MockWebSocket;
      const callback = jest.fn();
      socket.onerror = callback;
      socket.emit('error', { message: 'network failure' });
      socket.emit('close');
      await flushResourceReport();
      expect(callback).toHaveBeenCalledTimes(1);
      expect(mockMetadata.addResource).toHaveBeenCalledTimes(1);
      expect(mockMetadata.releaseResource).toHaveBeenCalled();
      expect(mockAddResource).not.toHaveBeenCalled();
    }
  );

  it('keeps unknown socket IDs on the native basic-data route', async () => {
    mockNativeBridgeAvailable = true;
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const savedAdd = MockWebSocket.prototype.addEventListener;
    jest
      .spyOn(MockWebSocket.prototype, 'addEventListener')
      .mockImplementation(function (this: MockWebSocket, ...args) {
        Reflect.deleteProperty(this, '_socketId');
        return savedAdd.apply(this, args);
      });
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/socket'
    ) as unknown as MockWebSocket;
    socket.emit('open');
    await flushResourceReport();
    expect(mockMetadata.startResource.mock.calls[0][1]).toBe(-1);
    expect(mockMetadata.addResource).toHaveBeenCalledTimes(1);
    expect(mockStartResource).not.toHaveBeenCalled();
  });

  it('isolates 100 concurrent native handshakes, reconnects and first-terminal signals', async () => {
    let now = 10;
    setPerformanceClock(() => now);
    mockNativeBridgeAvailable = true;
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const sockets = Array.from(
      { length: 100 },
      () =>
        new runtimeGlobal.WebSocket(
          'wss://example.com/socket'
        ) as unknown as MockWebSocket
    );
    now = 35;
    sockets.reverse().forEach((socket, index) => {
      socket.emit(index % 2 ? 'error' : 'open', {
        message: 'Received bad response code from server: 503.',
      });
      socket.emit('close');
      socket.emit('open');
    });
    await flushResourceReport();
    expect(mockMetadata.addResource).toHaveBeenCalledTimes(100);
    expect(
      new Set(mockMetadata.addResource.mock.calls.map((call) => call[0])).size
    ).toBe(100);
    mockMetadata.addResource.mock.calls.forEach((call) =>
      expect(call[2]).toEqual({ duration: 25_000_000 })
    );
    sockets.forEach((socket) =>
      expect(socket.listeners).toEqual({ open: [], error: [], close: [] })
    );
    const reconnect = new runtimeGlobal.WebSocket(
      'wss://example.com/socket'
    ) as unknown as MockWebSocket;
    now = 60;
    reconnect.emit('open');
    await flushResourceReport();
    expect(mockMetadata.addResource).toHaveBeenCalledTimes(101);
    expect(mockAddResource).not.toHaveBeenCalled();
  });

  it('finishes retired capture sessions after collection is re-enabled', async () => {
    mockNativeBridgeAvailable = true;
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const first = new runtimeGlobal.WebSocket(
      'wss://example.com/socket'
    ) as unknown as MockWebSocket;
    FTRumWebSocketTracking.stopTracking();
    mockNativeBridgeAvailable = true;
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const second = new runtimeGlobal.WebSocket(
      'wss://example.com/socket'
    ) as unknown as MockWebSocket;
    const sessions = mockMetadata.startResource.mock.calls.map(
      (call) => call[3]
    );
    expect(sessions[0]).not.toBe(sessions[1]);
    second.emit('open');
    first.emit('error', {
      message: 'Received bad response code from server: 403.',
    });
    await flushResourceReport();
    expect(mockMetadata.addResource).toHaveBeenCalledTimes(2);
    const firstKey = mockMetadata.startResource.mock.calls[0][0];
    const secondKey = mockMetadata.startResource.mock.calls[1][0];
    expect(
      mockMetadata.addResource.mock.calls.find((call) => call[0] === firstKey)
    ).toEqual([
      firstKey,
      expect.objectContaining({ webSocketEvent: 'error' }),
      expect.any(Object),
      sessions[0],
    ]);
    expect(
      mockMetadata.addResource.mock.calls.find((call) => call[0] === secondKey)
    ).toEqual([
      secondKey,
      expect.objectContaining({ webSocketEvent: 'open' }),
      expect.any(Object),
      sessions[1],
    ]);
    expect(mockAddResource).not.toHaveBeenCalled();
  });

  it('stops prepared native capture if the WebSocket constructor cannot be replaced', async () => {
    mockNativeBridgeAvailable = true;
    const descriptor = Object.getOwnPropertyDescriptor(
      runtimeGlobal,
      'WebSocket'
    )!;
    try {
      Object.defineProperty(runtimeGlobal, 'WebSocket', {
        ...descriptor,
        writable: false,
      });
      FTRumWebSocketTracking.startTracking(resourceReporter);
      expect(mockMetadata.stopCapture).toHaveBeenCalledTimes(1);
      expect(runtimeGlobal.WebSocket).toBe(MockWebSocket);
    } finally {
      // Reset the Jest VM's global property cell as well as its descriptor.
      Reflect.deleteProperty(runtimeGlobal, 'WebSocket');
      Object.defineProperty(runtimeGlobal, 'WebSocket', descriptor);
    }
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
      resourceStatus: 0,
      webSocketHandshakeState: 'success',
    });
  });

  it('reports a failed handshake once when error and close both fire', async () => {
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/failure'
    ) as unknown as MockWebSocket;

    socket.emit('error', {
      message: 'The Internet connection appears to be offline.',
    });
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
      errorMessage: 'The Internet connection appears to be offline.',
    });
    expect(mockAddResource.mock.calls[0][1]).not.toHaveProperty('errorCode');
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

  it.each([
    [100, 'rejected'],
    [101, 'failed'],
    [200, 'rejected'],
    [204, 'rejected'],
    [301, 'rejected'],
    [302, 'rejected'],
    [304, 'rejected'],
    [399, 'rejected'],
    [400, 'rejected'],
    [401, 'rejected'],
    [403, 'rejected'],
    [404, 'rejected'],
    [429, 'rejected'],
    [500, 'rejected'],
    [503, 'rejected'],
    [599, 'rejected'],
    [600, 'rejected'],
    [999, 'rejected'],
  ])(
    'classifies observed HTTP %s as %s when the handshake does not open',
    async (status, expectedState) => {
      let now = 10;
      setPerformanceClock(() => now);
      const start = deferred();
      const stop = deferred();
      mockStartResource.mockReturnValueOnce(start.promise);
      mockStopResource.mockReturnValueOnce(stop.promise);
      FTRumWebSocketTracking.startTracking(resourceReporter);
      const socket = new runtimeGlobal.WebSocket(
        'wss://example.com/rejected'
      ) as unknown as MockWebSocket;
      const message = `Received bad response code from server: ${status}.`;
      socket.onerror = jest.fn(() => {
        now = 1000;
      });
      now = 35;
      socket.emit('error', { message });
      socket.emit('open');
      socket.emit('close', { code: 1006, reason: message });
      expect(socket.listeners).toEqual({ open: [], error: [], close: [] });
      expect(mockStopResource).not.toHaveBeenCalled();
      start.resolve();
      await flushResourceReport();
      now = 2000;
      stop.resolve();
      await flushResourceReport();
      expect(socket.onerror).toHaveBeenCalledTimes(1);
      expect(mockAddResource).toHaveBeenCalledTimes(1);
      expect(mockAddResource.mock.calls[0][1]).toMatchObject({
        resourceStatus: status,
        webSocketHandshakeState: expectedState,
        errorMessage: message,
      });
      expect(mockAddResource.mock.calls[0][1]).not.toHaveProperty('errorCode');
      expect(mockAddResource.mock.calls[0][1]).not.toHaveProperty(
        'responseHeader'
      );
      expect(mockAddResource.mock.calls[0][2]).toEqual({
        duration: 25_000_000,
      });
      now = 10000;
      socket.emit('error', { message });
      await flushResourceReport();
      expect(mockAddResource).toHaveBeenCalledTimes(1);
    }
  );

  it.each([
    'Received bad response code from server: 403',
    '  RECEIVED  bad response CODE from SERVER :\t403 .\n',
  ])(
    'accepts harmless formatting changes in the native error: %s',
    async (message) => {
      FTRumWebSocketTracking.startTracking(resourceReporter);
      const socket = new runtimeGlobal.WebSocket(
        'wss://example.com/rejected'
      ) as unknown as MockWebSocket;
      socket.emit('error', { message });
      await flushResourceReport();
      expect(mockAddResource.mock.calls[0][1]).toMatchObject({
        resourceStatus: 403,
        webSocketHandshakeState: 'rejected',
        errorMessage: message,
      });
    }
  );

  it('keeps an observed HTTP 101 followed by a handshake error as failed', async () => {
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/invalid-upgrade'
    ) as unknown as MockWebSocket;
    socket.emit('error', {
      message: 'Received bad response code from server: 101.',
    });
    await flushResourceReport();
    expect(mockAddResource.mock.calls[0][1]).toMatchObject({
      resourceStatus: 101,
      webSocketHandshakeState: 'failed',
    });
  });

  it.each([
    undefined,
    null,
    403,
    '',
    'Timed out connecting to server.',
    'Invalid server certificate.',
    'Invalid Sec-WebSocket-Accept response.',
    'Received bad response code from proxy server: 403.',
    'Received bad response code from server: 0.',
    'Received bad response code from server: 99.',
    'Received bad response code from server: 1000.',
    'Received bad response code from server: 4030.',
    'Received bad response code from server: 403.5.',
    'Received bad response code from server: -403.',
    'Connection failed with code 403',
    'New native error format; HTTP status 403',
    'Untrusted text: Received bad response code from server: 403.',
    'Received bad response code from server: 403. Unrelated error 500',
    'Received bad response code from server:' + ' '.repeat(10000) + '403.',
  ])(
    'falls back safely without guessing a status (case %#)',
    async (message) => {
      FTRumWebSocketTracking.startTracking(resourceReporter);
      const socket = new runtimeGlobal.WebSocket(
        'wss://example.com/unknown-failure'
      ) as unknown as MockWebSocket;
      const businessError = jest.fn();
      socket.onerror = businessError;
      socket.emit('error', { message });
      socket.emit('close');
      await flushResourceReport();
      expect(businessError).toHaveBeenCalledTimes(1);
      expect(mockAddResource).toHaveBeenCalledTimes(1);
      expect(mockAddResource.mock.calls[0][1]).toMatchObject({
        resourceStatus: 0,
        webSocketHandshakeState: 'failed',
      });
      expect(mockAddResource.mock.calls[0][1].errorMessage).toBe(
        typeof message === 'string' && message.length > 0 ? message : undefined
      );
    }
  );

  it('captures the error boundary before reading native error details', async () => {
    let now = 10;
    setPerformanceClock(() => now);
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/rejected'
    ) as unknown as MockWebSocket;
    const readMessage = jest.fn(() => {
      now = 1000;
      return 'Received bad response code from server: 403.';
    });
    now = 35;
    socket.listeners.error[0](
      Object.defineProperty({}, 'message', { get: readMessage })
    );
    await flushResourceReport();
    expect(readMessage).toHaveBeenCalledTimes(1);
    expect(mockAddResource.mock.calls[0][1].webSocketHandshakeState).toBe(
      'rejected'
    );
    expect(mockAddResource.mock.calls[0][2]).toEqual({ duration: 25_000_000 });
  });

  describe.each(['legacy JS', 'native bridge'])(
    'failure details through %s',
    (route) => {
      const nativeRoute = route === 'native bridge';
      const message = 'Received bad response code from server: 403.';
      let now: number;
      const reports = () =>
        nativeRoute ? mockMetadata.addResource : mockAddResource;
      const starts = () =>
        nativeRoute ? mockMetadata.startResource : mockStartResource;
      const stops = () =>
        nativeRoute ? mockMetadata.stopResource : mockStopResource;
      const createSocket = () =>
        new runtimeGlobal.WebSocket(
          'wss://example.com/failure'
        ) as unknown as MockWebSocket;
      const expectReport = (expectedMessage?: string) => {
        expect(starts()).toHaveBeenCalledTimes(1);
        expect(stops()).toHaveBeenCalledTimes(1);
        expect(reports()).toHaveBeenCalledTimes(1);
        const [, content, metrics] = reports().mock.calls[0];
        expect(metrics).toEqual({ duration: 25_000_000 });
        if (expectedMessage) expect(content.errorMessage).toBe(expectedMessage);
        else expect(content).not.toHaveProperty('errorMessage');
        if (nativeRoute) {
          expect(content.webSocketEvent).toBe('error');
          expect(content).not.toHaveProperty('resourceStatus');
          expect(content).not.toHaveProperty('webSocketHandshakeState');
        } else {
          expect(content.resourceStatus).toBe(
            expectedMessage === message ? 403 : 0
          );
          expect(content.webSocketHandshakeState).toBe(
            expectedMessage === message ? 'rejected' : 'failed'
          );
        }
      };

      beforeEach(async () => {
        now = 10;
        setPerformanceClock(() => now);
        if (nativeRoute) mockNativeBridgeAvailable = true;
        FTRumWebSocketTracking.startTracking(resourceReporter);
      });

      it('supplements RN built-in EventTarget errors before the next microtask without extending duration', async () => {
        const socket = createSocket();
        const onError = jest.fn(() => {
          if (nativeRoute) expect(stops()).toHaveBeenCalledTimes(1);
          now = 1035;
        });
        const onClose = jest.fn();
        socket.onerror = onError;
        socket.onclose = onClose;
        const setTimeout = jest.spyOn(globalThis, 'setTimeout');
        now = 35;
        socket.emit('error');
        if (nativeRoute) expect(stops()).toHaveBeenCalledTimes(1);
        socket.emit('close', { code: 1006, reason: message });
        socket.emit('close', { code: 1006, reason: 'late replacement' });
        socket.emit('open');
        await flushResourceReport();
        expectReport(message);
        expect(onError).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(2);
        expect(setTimeout).not.toHaveBeenCalled();
        expect(
          Object.values(socket.listeners).every(
            (listeners) => listeners.length === 0
          )
        ).toBe(true);
      });

      it('preserves a native network error description without inventing HTTP status', async () => {
        const socket = createSocket();
        now = 35;
        socket.emit('error');
        socket.emit('close', {
          code: 1006,
          reason: 'The Internet connection appears to be offline.',
        });
        await flushResourceReport();
        expectReport('The Internet connection appears to be offline.');
      });

      it('keeps the original error.message ahead of close.reason', async () => {
        const socket = createSocket();
        now = 35;
        socket.emit('error', { message });
        expect(socket.listeners.close).toHaveLength(0);
        socket.emit('close', {
          code: 1006,
          reason: 'Received bad response code from server: 503.',
        });
        await flushResourceReport();
        expectReport(message);
      });

      it.each(['missing', 'late', 'wrong-code', 'missing-code', 'empty'])(
        'ends the supplement window when close details are %s',
        async (kind) => {
          const socket = createSocket();
          now = 35;
          socket.emit('error');
          if (kind === 'late') await Promise.resolve();
          if (kind !== 'missing')
            socket.emit('close', {
              code:
                kind === 'wrong-code'
                  ? 1000
                  : kind === 'missing-code'
                  ? undefined
                  : 1006,
              reason: kind === 'empty' ? '' : message,
            });
          await flushResourceReport();
          expectReport();
          expect(
            Object.values(socket.listeners).every(
              (listeners) => listeners.length === 0
            )
          ).toBe(true);
        }
      );

      it.each(['start', 'stop'])(
        'supplements details while %s handling is delayed',
        async (phase) => {
          const gate = deferred();
          (phase === 'start' ? starts() : stops()).mockReturnValueOnce(
            gate.promise
          );
          const socket = createSocket();
          now = 35;
          socket.emit('error');
          socket.emit('close', { code: 1006, reason: message });
          await Promise.resolve();
          expect(socket.listeners.close).toHaveLength(0);
          now = 1000;
          gate.resolve();
          await flushResourceReport();
          expectReport(message);
        }
      );

      it('cleans up the window even if resource start never settles', async () => {
        starts().mockReturnValueOnce(new Promise(() => {}));
        const socket = createSocket();
        now = 35;
        socket.emit('error');
        await Promise.resolve();
        expect(socket.listeners.close).toHaveLength(0);
        socket.emit('close', { code: 1006, reason: message });
        expect(reports()).not.toHaveBeenCalled();
      });

      it('ignores a queued close callback after the microtask window', async () => {
        const socket = createSocket();
        const onClose = socket.listeners.close[0];
        const readReason = jest.fn(() => message);
        const event = Object.defineProperty({ code: 1006 }, 'reason', {
          get: readReason,
        });
        now = 35;
        socket.emit('error');
        await Promise.resolve();
        onClose(event);
        await flushResourceReport();
        expect(readReason).not.toHaveBeenCalled();
        expectReport();
      });

      it('cancels reporting if start fails during the supplement window', async () => {
        starts().mockRejectedValueOnce(new Error('start failed'));
        const socket = createSocket();
        now = 35;
        socket.emit('error');
        socket.emit('close', { code: 1006, reason: message });
        await flushResourceReport();
        expect(reports()).not.toHaveBeenCalled();
        expect(socket.listeners.close).toHaveLength(0);
      });

      it.each(['code', 'reason'])(
        'contains a throwing close.%s accessor',
        async (field) => {
          const socket = createSocket();
          const onClose = socket.listeners.close[0];
          const event = Object.defineProperty(
            { code: 1006, reason: message },
            field,
            {
              get() {
                now = 1000;
                throw new Error('unavailable close detail');
              },
            }
          );
          now = 35;
          socket.emit('error');
          expect(() => onClose(event)).not.toThrow();
          await flushResourceReport();
          expectReport();
        }
      );

      it('drops the pending supplement when shutdown runs inside the error callback', async () => {
        const socket = createSocket();
        const onClose = socket.listeners.close[0];
        socket.onerror = () => FTRumWebSocketTracking.shutDown();
        now = 35;
        socket.emit('error');
        expect(socket.listeners.close).toHaveLength(0);
        onClose({ code: 1006, reason: message });
        await flushResourceReport();
        expect(reports()).not.toHaveBeenCalled();
      });

      it('does not restore details when their accessor shuts down the SDK', async () => {
        const socket = createSocket();
        const onClose = socket.listeners.close[0];
        now = 35;
        socket.emit('error');
        onClose(
          Object.defineProperty({ code: 1006 }, 'reason', {
            get() {
              FTRumWebSocketTracking.shutDown();
              return message;
            },
          })
        );
        await flushResourceReport();
        expect(socket.listeners.close).toHaveLength(0);
        expect(reports()).not.toHaveBeenCalled();
      });

      it('finishes a started failure after collection is disabled', async () => {
        const socket = createSocket();
        socket.onerror = () => FTRumWebSocketTracking.stopTracking();
        now = 35;
        socket.emit('error');
        socket.emit('close', { code: 1006, reason: message });
        await flushResourceReport();
        expectReport(message);
      });

      it('isolates concurrent failure windows and reconnects', async () => {
        const sockets = Array.from({ length: 20 }, createSocket);
        now = 35;
        sockets.forEach((socket) => socket.emit('error'));
        sockets.forEach((socket, index) =>
          socket.emit('close', {
            code: 1006,
            reason: `network failure ${index}`,
          })
        );
        await flushResourceReport();
        expect(starts()).toHaveBeenCalledTimes(20);
        expect(stops()).toHaveBeenCalledTimes(20);
        expect(reports()).toHaveBeenCalledTimes(20);
        expect(new Set(reports().mock.calls.map((call) => call[0])).size).toBe(
          20
        );
        reports().mock.calls.forEach(([, content, metrics], index) => {
          expect(content.errorMessage).toBe(`network failure ${index}`);
          expect(metrics).toEqual({ duration: 25_000_000 });
        });
        const reconnected = createSocket();
        now = 60;
        reconnected.emit('error');
        reconnected.emit('close', {
          code: 1006,
          reason: 'reconnected failure',
        });
        await flushResourceReport();
        expect(reports()).toHaveBeenCalledTimes(21);
        expect(reports().mock.calls[20][1].errorMessage).toBe(
          'reconnected failure'
        );
        expect(reports().mock.calls[20][2]).toEqual({ duration: 25_000_000 });
      });
    }
  );

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

  it('still completes once when the error message accessor throws', async () => {
    let now = 10;
    setPerformanceClock(() => now);
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/unavailable-error'
    ) as unknown as MockWebSocket;
    const readMessage = jest.fn(() => {
      now = 1000;
      throw new Error('unavailable native error details');
    });
    const onError = socket.listeners.error[0];
    const event = Object.defineProperty({}, 'message', { get: readMessage });
    now = 35;
    expect(() => onError(event)).not.toThrow();
    onError(event);
    await flushResourceReport();
    expect(readMessage).toHaveBeenCalledTimes(1);
    expect(mockAddResource).toHaveBeenCalledTimes(1);
    expect(mockAddResource.mock.calls[0][1]).toMatchObject({
      resourceStatus: 0,
      webSocketHandshakeState: 'failed',
    });
    expect(mockAddResource.mock.calls[0][1]).not.toHaveProperty('errorMessage');
    expect(mockAddResource.mock.calls[0][2]).toEqual({ duration: 25_000_000 });
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
    expect(mockCancelWebSocketTrace).not.toHaveBeenCalled();
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

  it('stops capture immediately on SDK shutdown and resets automatic trace injection', async () => {
    FTRumWebSocketTracking.startTracking(resourceReporter);

    const shutdown = FTMobileReactNative.shutDown();
    expect(runtimeGlobal.WebSocket).toBe(MockWebSocket);
    new runtimeGlobal.WebSocket('wss://example.com/after-shutdown');
    expect(mockStartResource).not.toHaveBeenCalled();
    expect(mockGetTraceHeaderFieldsSync).not.toHaveBeenCalled();
    await shutdown;

    // A new RUM initialization must not inherit the previous Trace configuration.
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/reinitialized'
    ) as unknown as MockWebSocket;
    expect(mockStartResource).toHaveBeenCalledTimes(1);
    expect(mockGetTraceHeaderFieldsSync).not.toHaveBeenCalled();
    socket.emit('open');
    await flushResourceReport();
    expect(mockAddResource).toHaveBeenCalledTimes(1);

    FTRumWebSocketTracking.setNativeAutoTraceEnabled(true);
    new runtimeGlobal.WebSocket('wss://example.com/new-trace');
    expect(mockGetTraceHeaderFieldsSync).toHaveBeenCalledTimes(1);
  });

  it('removes pending capture listeners on shutdown without changing business sockets', async () => {
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/pending'
    ) as unknown as MockWebSocket;
    const businessOpen = jest.fn();
    socket.addEventListener('open', businessOpen);
    socket.onopen = businessOpen;

    await FTMobileReactNative.shutDown();
    expect(socket.listeners.open).toEqual([businessOpen]);
    expect(socket.listeners.error).toEqual([]);
    expect(socket.listeners.close).toEqual([]);
    expect(socket.close).not.toHaveBeenCalled();

    FTRumWebSocketTracking.startTracking(resourceReporter);
    socket.emit('open');
    socket.send('business message');
    await flushResourceReport();
    expect(businessOpen).toHaveBeenCalledTimes(2);
    expect(socket.send).toHaveBeenCalledWith('business message');
    expect(mockStopResource).not.toHaveBeenCalled();
    expect(mockAddResource).not.toHaveBeenCalled();
  });

  it.each(['start', 'stop'])(
    'discards a completed handshake awaiting the %s bridge result when shutdown occurs',
    async (stage) => {
      let releaseBridge!: () => void;
      const bridgePromise = new Promise<void>((resolve) => {
        releaseBridge = resolve;
      });
      const bridge = stage === 'start' ? mockStartResource : mockStopResource;
      bridge.mockReturnValueOnce(bridgePromise);
      FTRumWebSocketTracking.startTracking(resourceReporter);
      const socket = new runtimeGlobal.WebSocket(
        'wss://example.com/pending-bridge'
      ) as unknown as MockWebSocket;
      socket.emit('open');
      await flushResourceReport();

      await FTMobileReactNative.shutDown();
      FTRumWebSocketTracking.startTracking(resourceReporter);
      releaseBridge();
      await flushResourceReport();
      expect(mockStopResource).toHaveBeenCalledTimes(stage === 'start' ? 0 : 1);
      expect(mockAddResource).not.toHaveBeenCalled();
    }
  );

  it('discards a terminal error awaiting the bridge when SDK shutdown starts', async () => {
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/error'
    ) as unknown as MockWebSocket;
    socket.emit('error', { message: 'connection failed' });

    await FTMobileReactNative.shutDown();
    await flushResourceReport();
    expect(mockStopResource).not.toHaveBeenCalled();
    expect(mockAddResource).not.toHaveBeenCalled();
  });

  it.each(['monitor', 'native SDK'])(
    'keeps WebSocket capture disabled when shutting down the %s fails',
    async (stage) => {
      const failure = new Error('shutdown failed');
      const shutdownStep =
        stage === 'monitor' ? mockStopLongTaskTracking : mockNativeShutdown;
      shutdownStep.mockRejectedValueOnce(failure);
      FTRumWebSocketTracking.startTracking(resourceReporter);

      await expect(FTMobileReactNative.shutDown()).rejects.toBe(failure);
      expect(runtimeGlobal.WebSocket).toBe(MockWebSocket);
      expect(mockNativeShutdown).toHaveBeenCalledTimes(1);
      FTRumWebSocketTracking.startTracking(resourceReporter);
      new runtimeGlobal.WebSocket('wss://example.com/new-session');
      expect(mockGetTraceHeaderFieldsSync).not.toHaveBeenCalled();
    }
  );

  it('preserves a later WebSocket wrapper while disabling the SDK wrapper underneath', async () => {
    FTRumWebSocketTracking.startTracking(resourceReporter);
    class CustomerWebSocket extends runtimeGlobal.WebSocket {}
    runtimeGlobal.WebSocket = CustomerWebSocket;

    await FTMobileReactNative.shutDown();
    expect(runtimeGlobal.WebSocket).toBe(CustomerWebSocket);
    new runtimeGlobal.WebSocket('wss://example.com/after-shutdown');
    expect(mockStartResource).not.toHaveBeenCalled();
    expect(mockGetTraceHeaderFieldsSync).not.toHaveBeenCalled();

    FTRumWebSocketTracking.startTracking(resourceReporter);
    new runtimeGlobal.WebSocket('wss://example.com/reinitialized');
    expect(mockStartResource).toHaveBeenCalledTimes(1);
    FTRumWebSocketTracking.stopTracking();
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

  it('freezes monotonic handshake duration before business callbacks and delayed bridge completion', async () => {
    let now = 10;
    setPerformanceClock(() => now);
    const start = deferred();
    const stop = deferred();
    mockStartResource.mockReturnValueOnce(start.promise);
    mockStopResource.mockReturnValueOnce(stop.promise);
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/timing'
    ) as unknown as MockWebSocket;
    socket.onopen = jest.fn(() => {
      now = 1000;
    });
    now = 35.25;
    socket.emit('open');
    expect(socket.listeners.open).toEqual([]);
    expect(mockStopResource).not.toHaveBeenCalled();
    start.resolve();
    await flushResourceReport();
    now = 2000;
    stop.resolve();
    await flushResourceReport();
    expect(socket.onopen).toHaveBeenCalledTimes(1);
    expect(mockAddResource.mock.calls[0][2]).toEqual({ duration: 25_250_000 });
    expect(mockAddResource.mock.calls[0][1]).not.toHaveProperty('duration');
    now = 100000;
    socket.emit('close');
    expect(mockAddResource).toHaveBeenCalledTimes(1);
  });

  it('uses the first error as the terminal event even when open and close follow synchronously', async () => {
    let now = 10;
    setPerformanceClock(() => now);
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/events'
    ) as unknown as MockWebSocket;
    const businessError = jest.fn(() => {
      now = 100;
    });
    socket.onerror = businessError;
    now = 20;
    socket.emit('error', { message: 'opening failed' });
    socket.emit('open');
    socket.emit('close', { code: 1006, reason: 'not a native error code' });
    await flushResourceReport();
    expect(businessError).toHaveBeenCalledTimes(1);
    expect(mockAddResource).toHaveBeenCalledTimes(1);
    expect(mockAddResource.mock.calls[0][1]).toMatchObject({
      webSocketHandshakeState: 'failed',
      errorMessage: 'opening failed',
    });
    expect(mockAddResource.mock.calls[0][2]).toEqual({ duration: 10_000_000 });
  });

  it('does not read close codes or reasons or turn them into a network error', async () => {
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/cancel'
    ) as unknown as MockWebSocket;
    const readCloseDetail = jest.fn(() => {
      throw new Error('must not read close details');
    });
    const event = Object.defineProperties(
      {},
      {
        code: { get: readCloseDetail },
        reason: { get: readCloseDetail },
      }
    );
    socket.listeners.close[0](event);
    await flushResourceReport();
    expect(readCloseDetail).not.toHaveBeenCalled();
    const resource = mockAddResource.mock.calls[0][1];
    expect(resource.webSocketHandshakeState).toBe('failed');
    expect(resource).not.toHaveProperty('errorCode');
    expect(resource).not.toHaveProperty('errorMessage');
  });

  it.each(['throw', 'reject'])(
    'isolates a startResource %s while the handshake is pending',
    async (mode) => {
      jest.spyOn(console, 'warn').mockImplementation();
      const failure = new Error('start failed');
      if (mode === 'throw') {
        mockStartResource.mockImplementationOnce(() => {
          throw failure;
        });
      } else {
        mockStartResource.mockRejectedValueOnce(failure);
      }
      FTRumWebSocketTracking.startTracking(resourceReporter);
      const socket = new runtimeGlobal.WebSocket(
        'wss://example.com/pending'
      ) as unknown as MockWebSocket;
      const businessOpen = jest.fn();
      socket.onopen = businessOpen;
      await flushResourceReport();
      expect(socket.listeners).toEqual({ open: [], error: [], close: [] });
      socket.emit('open');
      socket.send('still works');
      expect(businessOpen).toHaveBeenCalledTimes(1);
      expect(socket.close).not.toHaveBeenCalled();
      expect(mockStopResource).not.toHaveBeenCalled();
      expect(mockAddResource).not.toHaveBeenCalled();
    }
  );

  it.each(['throw', 'reject'])(
    'attempts completion once after a stopResource %s',
    async (mode) => {
      jest.spyOn(console, 'warn').mockImplementation();
      if (mode === 'throw') {
        mockStopResource.mockImplementationOnce(() => {
          throw new Error('stop failed');
        });
      } else {
        mockStopResource.mockRejectedValueOnce(new Error('stop failed'));
      }
      FTRumWebSocketTracking.startTracking(resourceReporter);
      const socket = new runtimeGlobal.WebSocket(
        'wss://example.com/stop'
      ) as unknown as MockWebSocket;
      socket.emit('open');
      socket.emit('error');
      await flushResourceReport();
      expect(mockStopResource).toHaveBeenCalledTimes(1);
      expect(mockAddResource).toHaveBeenCalledTimes(1);
      expect(mockAddResource.mock.calls[0][1].webSocketHandshakeState).toBe(
        'success'
      );
    }
  );

  it('contains reporting and logger failures without retrying or breaking business callbacks', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {
      throw new Error('logger failed');
    });
    mockAddResource.mockRejectedValue(new Error('report failed'));
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const businessOpen = jest.fn();
    for (let i = 0; i < 3; i++) {
      const socket = new runtimeGlobal.WebSocket(
        'wss://example.com/report'
      ) as unknown as MockWebSocket;
      socket.onopen = businessOpen;
      expect(() => socket.emit('open')).not.toThrow();
      socket.emit('close');
    }
    await flushResourceReport();
    expect(businessOpen).toHaveBeenCalledTimes(3);
    expect(mockAddResource).toHaveBeenCalledTimes(3);
    expect(warning).toHaveBeenCalledTimes(1);
  });

  it('returns the original socket and removes partially installed listeners if observation fails', () => {
    jest.spyOn(console, 'warn').mockImplementation();
    const originalAdd = MockWebSocket.prototype.addEventListener;
    jest
      .spyOn(MockWebSocket.prototype, 'addEventListener')
      .mockImplementation(function (type, listener) {
        if (type === 'error') {
          throw new Error('listener installation failed');
        }
        originalAdd.call(this, type, listener);
      });
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/listeners'
    ) as unknown as MockWebSocket;
    expect(MockWebSocket.instances).toEqual([socket]);
    expect(socket.listeners.open).toEqual([]);
    expect(mockStartResource).not.toHaveBeenCalled();
    expect(socket.close).not.toHaveBeenCalled();
    socket.send('still works');
    expect(socket.send).toHaveBeenCalledWith('still works');
    expect(mockCancelWebSocketTrace).toHaveBeenCalledTimes(1);
    expect(mockCancelWebSocketTrace).toHaveBeenCalledWith(
      mockGetTraceHeaderFieldsSync.mock.calls[0][1]
    );
  });

  it('continues business dispatch and other cleanup if removing one listener throws', async () => {
    jest.spyOn(console, 'warn').mockImplementation();
    const originalRemove = MockWebSocket.prototype.removeEventListener;
    jest
      .spyOn(MockWebSocket.prototype, 'removeEventListener')
      .mockImplementation(function (type, listener) {
        if (type === 'open') {
          throw new Error('cannot remove');
        }
        originalRemove.call(this, type, listener);
      });
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/cleanup'
    ) as unknown as MockWebSocket;
    socket.onopen = jest.fn();
    socket.emit('open');
    socket.emit('open');
    await flushResourceReport();
    expect(socket.onopen).toHaveBeenCalledTimes(2);
    expect(socket.listeners.error).toEqual([]);
    expect(socket.listeners.close).toEqual([]);
    expect(mockAddResource).toHaveBeenCalledTimes(1);
  });

  it('keeps a retained constructor passive across reinitialization and wrapper chaining', async () => {
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const retained = runtimeGlobal.WebSocket;
    FTRumWebSocketTracking.stopTracking();
    class CustomerWebSocket extends retained {}
    runtimeGlobal.WebSocket = CustomerWebSocket;
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/chain'
    ) as unknown as MockWebSocket;
    socket.emit('open');
    new retained('wss://example.com/retained');
    await flushResourceReport();
    expect(mockStartResource).toHaveBeenCalledTimes(1);
    expect(mockGetTraceHeaderFieldsSync).toHaveBeenCalledTimes(1);
    expect(mockAddResource).toHaveBeenCalledTimes(1);
  });

  it('reinstalls once when the global constructor is replaced during tracking', async () => {
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const retained = runtimeGlobal.WebSocket;
    class ReplacementWebSocket extends MockWebSocket {}
    runtimeGlobal.WebSocket =
      ReplacementWebSocket as unknown as typeof WebSocket;
    FTRumWebSocketTracking.startTracking(resourceReporter);
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/replaced'
    ) as unknown as MockWebSocket;
    new retained('wss://example.com/old');
    socket.emit('open');
    await flushResourceReport();
    expect(socket).toBeInstanceOf(ReplacementWebSocket);
    expect(mockStartResource).toHaveBeenCalledTimes(1);
    expect(mockAddResource).toHaveBeenCalledTimes(1);
    FTRumWebSocketTracking.stopTracking();
    expect(runtimeGlobal.WebSocket).toBe(ReplacementWebSocket);
  });

  it('preserves frozen options and does not mutate application headers', async () => {
    const options = Object.freeze({
      headers: Object.freeze({ Authorization: 'token' }),
    });
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/options',
      ['json'],
      options
    ) as unknown as MockWebSocket;
    socket.emit('open');
    await flushResourceReport();
    expect(options).toEqual({ headers: { Authorization: 'token' } });
    expect(socket.constructorArguments[2]).toEqual({
      headers: { Authorization: 'token', traceparent: 'sdk-trace-header' },
    });
  });

  it('reads header options once and replaces all casing variants of injected trace headers', async () => {
    const headers = jest.fn(() => ({
      TraceParent: 'first',
      TRACEPARENT: 'second',
      Authorization: 'token',
    }));
    const options = Object.defineProperty(
      { handshakeTimeout: 1000 },
      'headers',
      { enumerable: true, get: headers }
    );
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/headers',
      undefined,
      options
    ) as unknown as MockWebSocket;
    socket.emit('open');
    await flushResourceReport();
    expect(headers).toHaveBeenCalledTimes(1);
    expect(socket.constructorArguments[2]).toEqual({
      handshakeTimeout: 1000,
      headers: { Authorization: 'token', traceparent: 'sdk-trace-header' },
    });
    expect(mockAddResource.mock.calls[0][1].requestHeader).toEqual({
      Authorization: 'token',
      traceparent: 'sdk-trace-header',
    });
  });

  it('falls back to the original arguments when SDK inspection fails', () => {
    jest.spyOn(console, 'warn').mockImplementation();
    const options = {
      get headers() {
        throw new Error('uninspectable');
      },
    };
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const socket = new runtimeGlobal.WebSocket(
      'wss://example.com/options',
      undefined,
      options
    ) as unknown as MockWebSocket;
    expect(socket.constructorArguments[2]).toBe(options);
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(mockStartResource).not.toHaveBeenCalled();
    expect(mockCancelWebSocketTrace).toHaveBeenCalledTimes(1);
    expect(mockCancelWebSocketTrace).toHaveBeenCalledWith(
      mockGetTraceHeaderFieldsSync.mock.calls[0][1]
    );
  });

  it.each([
    ['headers', false],
    ['listeners', false],
    ['headers', true],
    ['listeners', true],
  ])(
    'cleans only abandoned Trace keys after %s preparation fails (native route: %s)',
    async (stage, nativeRoute) => {
      jest.spyOn(console, 'warn').mockImplementation();
      const retainedKeys = new Set<string>();
      mockGetTraceHeaderFieldsSync.mockImplementation(
        (_url?: string, key?: string) => {
          retainedKeys.add(key!);
          return { traceparent: 'sdk-trace-header' };
        }
      );
      mockCancelWebSocketTrace.mockImplementation(async (key: string) => {
        retainedKeys.delete(key);
      });
      if (nativeRoute) mockNativeBridgeAvailable = true;
      FTRumWebSocketTracking.startTracking(resourceReporter);
      const active = new runtimeGlobal.WebSocket(
        'wss://example.com/active'
      ) as unknown as MockWebSocket;
      const activeKey = mockGetTraceHeaderFieldsSync.mock.calls[0][1];
      for (let index = 0; index < 3; index++) {
        if (stage === 'listeners') {
          jest
            .spyOn(MockWebSocket.prototype, 'addEventListener')
            .mockImplementationOnce(() => {
              throw new Error('listener unavailable');
            });
        }
        const options =
          stage === 'headers'
            ? {
                get headers() {
                  throw new Error('header unavailable');
                },
              }
            : {};
        const socket = new runtimeGlobal.WebSocket(
          'wss://example.com/abandoned',
          [],
          options
        ) as unknown as MockWebSocket;
        socket.emit('error');
        socket.emit('close');
        expect(socket.close).not.toHaveBeenCalled();
      }
      expect(mockCancelWebSocketTrace).toHaveBeenCalledTimes(3);
      expect(retainedKeys).toEqual(new Set([activeKey]));
      const start = nativeRoute
        ? mockMetadata.startResource
        : mockStartResource;
      const add = nativeRoute ? mockMetadata.addResource : mockAddResource;
      expect(start).toHaveBeenCalledTimes(1);
      active.emit('open');
      await flushResourceReport();
      expect(add).toHaveBeenCalledTimes(1);
      expect(add.mock.calls[0][0]).toBe(activeKey);
      expect(mockCancelWebSocketTrace).toHaveBeenCalledTimes(3);
    }
  );

  it.each(['missing', 'throw', 'reject'])(
    'preserves business construction when Trace cancellation is %s',
    async (failure) => {
      jest.spyOn(console, 'warn').mockImplementation();
      if (failure === 'missing') {
        Reflect.deleteProperty(mockTrace, 'cancelWebSocketTrace');
      } else if (failure === 'throw') {
        mockCancelWebSocketTrace.mockImplementation(() => {
          throw new Error('cleanup failed');
        });
      } else {
        mockCancelWebSocketTrace.mockRejectedValue(new Error('cleanup failed'));
      }
      FTRumWebSocketTracking.startTracking(resourceReporter);
      const options = {
        get headers() {
          throw new Error('header failed');
        },
      };
      const socket = new runtimeGlobal.WebSocket(
        'wss://example.com/options',
        [],
        options
      ) as unknown as MockWebSocket;
      expect(socket.constructorArguments[2]).toBe(options);
      expect(socket.close).not.toHaveBeenCalled();
      await flushResourceReport();
      expect(mockStartResource).not.toHaveBeenCalled();
    }
  );

  it('does not cancel Trace when disabled even if header preparation fails', () => {
    jest.spyOn(console, 'warn').mockImplementation();
    FTRumWebSocketTracking.setNativeAutoTraceEnabled(false);
    FTRumWebSocketTracking.startTracking(resourceReporter);
    new runtimeGlobal.WebSocket('wss://example.com/options', [], {
      get headers() {
        throw new Error('header failed');
      },
    });
    expect(mockGetTraceHeaderFieldsSync).not.toHaveBeenCalled();
    expect(mockCancelWebSocketTrace).not.toHaveBeenCalled();
  });

  it('keeps the original Trace key when header inspection triggers shutdown', () => {
    jest.spyOn(console, 'warn').mockImplementation();
    FTRumWebSocketTracking.startTracking(resourceReporter);
    new runtimeGlobal.WebSocket('wss://example.com/options', [], {
      get headers() {
        FTRumWebSocketTracking.shutDown();
        throw new Error('header failed after shutdown');
      },
    });
    expect(mockCancelWebSocketTrace).toHaveBeenCalledTimes(1);
    expect(mockCancelWebSocketTrace).toHaveBeenCalledWith(
      mockGetTraceHeaderFieldsSync.mock.calls[0][1]
    );
    expect(mockStartResource).not.toHaveBeenCalled();
  });

  it('does not coerce nonstandard URLs or change invalid constructor options', () => {
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const url = {
      toString: jest.fn(() => {
        throw new Error('unexpected coercion');
      }),
    };
    const socket = Reflect.construct(runtimeGlobal.WebSocket, [
      url,
    ]) as MockWebSocket;
    const invalidOptions = Reflect.construct(runtimeGlobal.WebSocket, [
      'wss://example.com',
      [],
      null,
    ]) as MockWebSocket;
    expect(socket.constructorArguments[0]).toBe(url);
    expect(url.toString).not.toHaveBeenCalled();
    expect(invalidOptions.constructorArguments[2]).toBeNull();
    expect(mockStartResource).not.toHaveBeenCalled();
    expect(mockGetTraceHeaderFieldsSync).not.toHaveBeenCalled();
  });

  it('does not break initialization or shutdown when the global constructor is read-only', async () => {
    jest.spyOn(console, 'warn').mockImplementation();
    const descriptor = Object.getOwnPropertyDescriptor(
      runtimeGlobal,
      'WebSocket'
    )!;
    try {
      Object.defineProperty(runtimeGlobal, 'WebSocket', {
        ...descriptor,
        writable: false,
      });
      expect(() =>
        FTRumWebSocketTracking.startTracking(resourceReporter)
      ).not.toThrow();
      expect(runtimeGlobal.WebSocket).toBe(MockWebSocket);
      Object.defineProperty(runtimeGlobal, 'WebSocket', descriptor);
      FTRumWebSocketTracking.startTracking(resourceReporter);
      const wrapper = runtimeGlobal.WebSocket;
      Object.defineProperty(runtimeGlobal, 'WebSocket', {
        configurable: true,
        writable: false,
        value: wrapper,
      });
      await expect(FTMobileReactNative.shutDown()).resolves.toBeUndefined();
      new wrapper('wss://example.com/frozen');
      expect(mockStartResource).not.toHaveBeenCalled();
      Object.defineProperty(runtimeGlobal, 'WebSocket', {
        configurable: true,
        writable: true,
        value: wrapper,
      });
      FTRumWebSocketTracking.stopTracking();
    } finally {
      Object.defineProperty(runtimeGlobal, 'WebSocket', descriptor);
    }
  });

  it('isolates 100 concurrent handshakes and reconnections without message listeners or duplicate resources', async () => {
    FTRumWebSocketTracking.startTracking(resourceReporter);
    const sockets: MockWebSocket[] = [];
    for (let round = 0; round < 2; round++) {
      for (let i = 0; i < 100; i++) {
        sockets.push(
          new runtimeGlobal.WebSocket(
            'wss://example.com/concurrent'
          ) as unknown as MockWebSocket
        );
      }
      for (const socket of sockets.slice(round * 100)) {
        socket.emit('open');
        socket.emit('error', { message: 'after opening' });
        socket.emit('close');
      }
      await flushResourceReport();
    }
    expect(new Set(mockStartResource.mock.calls.map(([key]) => key)).size).toBe(
      200
    );
    expect(mockAddResource).toHaveBeenCalledTimes(200);
    sockets.forEach((socket) => {
      expect(socket.listeners).toEqual({ open: [], error: [], close: [] });
      expect(socket.close).not.toHaveBeenCalled();
    });
    mockAddResource.mock.calls.forEach(([key, resource, metrics]) => {
      expect(key).toBeDefined();
      expect(resource).not.toHaveProperty('responseBody');
      expect(resource).not.toHaveProperty('resourceSize');
      expect(resource).not.toHaveProperty('duration');
      expect(Object.keys(metrics)).toEqual(['duration']);
    });
  });
});
