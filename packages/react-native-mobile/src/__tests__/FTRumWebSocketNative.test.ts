/* eslint-disable @typescript-eslint/no-var-requires */
const mockNative = {
  startCapture: jest.fn(),
  stopCapture: jest.fn(),
  clear: jest.fn(),
  startResource: jest.fn(),
  stopResource: jest.fn(),
  addResource: jest.fn(),
  releaseResource: jest.fn(),
};
jest.mock('../specs/NativeFTReactNativeWebSocket', () => ({
  __esModule: true,
  default: mockNative,
}));
const mockContext = jest.fn(() => ({}));
jest.mock('../ft_mobile_agent', () => ({
  bridgeContextManager: { mergeWithLocalPropertiesSync: () => mockContext() },
}));
const {
  NativeWebSocketSession,
  webSocketNativeID,
  startNativeWebSocketSession,
} = require('../rum/FTRumWebSocketNative');

const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};

describe('WebSocket native reporting bridge', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(globalThis, 'setTimeout');
    mockNative.startCapture.mockResolvedValue(undefined);
    mockContext.mockReturnValue({});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('enqueues reporting immediately and ignores a late capture reply after stop', async () => {
    let resolve!: () => void;
    mockNative.startCapture.mockReturnValue(
      new Promise<void>((done) => {
        resolve = done;
      })
    );
    const session = new NativeWebSocketSession('session');
    await session.startResource('a', 0, 'wss://host');
    expect(mockNative.startCapture.mock.invocationCallOrder[0]).toBeLessThan(
      mockNative.startResource.mock.invocationCallOrder[0]
    );
    expect(mockNative.startResource).toHaveBeenCalledTimes(1);
    session.stop();
    resolve();
    await flush();
    expect(mockNative.startCapture).toHaveBeenCalledTimes(1);
    expect(mockNative.stopCapture).toHaveBeenCalledTimes(1);
    expect(globalThis.setTimeout).not.toHaveBeenCalled();
  });

  it('uses only start/stop/add with event-time context snapshots and no terminal timers', async () => {
    const session = new NativeWebSocketSession('s');
    mockContext
      .mockReturnValueOnce({ view: 'start-view' })
      .mockReturnValueOnce({ view: 'stop-view' });
    session.startResource('a', 0, 'wss://host');
    session.stopResource('a', 'open');
    const content = {
      url: 'wss://host',
      httpMethod: 'GET',
      requestHeader: {},
      webSocketEvent: 'open',
    };
    await session.addResource('a', content, { duration: 25_000_000 });
    expect(mockNative.startResource).toHaveBeenCalledWith(
      'a',
      0,
      'wss://host',
      's',
      1,
      { view: 'start-view' }
    );
    expect(mockNative.stopResource).toHaveBeenCalledWith('a', 'open', 's', {
      view: 'stop-view',
    });
    expect(mockNative.addResource).toHaveBeenCalledWith(
      'a',
      content,
      { duration: 25_000_000 },
      's'
    );
    expect(globalThis.setTimeout).not.toHaveBeenCalled();
  });

  it.each(['throw', 'reject'])(
    'keeps native reporting when the optional capture reply fails with %s',
    async (failure) => {
      mockNative.startCapture.mockImplementationOnce(() => {
        if (failure === 'throw') throw new Error('bridge');
        return Promise.reject(new Error('bridge'));
      });
      const session = new NativeWebSocketSession('s');
      await session.startResource('a', 0, 'wss://host');
      await flush();
      expect(mockNative.startResource).toHaveBeenCalledTimes(1);
      expect(mockNative.stopCapture).not.toHaveBeenCalled();
      expect(globalThis.setTimeout).not.toHaveBeenCalled();
    }
  );

  it('stops capture once while retaining the session for an existing handshake', async () => {
    const session = new NativeWebSocketSession('s');
    session.startResource('a', 0, 'wss://host');
    session.startResource('b', 1, 'wss://host');
    expect(mockNative.startResource.mock.calls.map((call) => call[4])).toEqual([
      1, 2,
    ]);
    session.stop();
    session.stop();
    await session.stopResource('a', 'error');
    expect(mockNative.stopCapture).toHaveBeenCalledTimes(1);
    expect(mockNative.stopResource).toHaveBeenCalledWith('a', 'error', 's', {});
  });

  it.each(['startResource', 'stopResource', 'addResource'])(
    'uses legacy JS when an older native module lacks %s',
    (method) => {
      const original = mockNative[method];
      mockNative[method] = undefined;
      try {
        expect(startNativeWebSocketSession(() => 'key')).toBeUndefined();
        expect(mockNative.startCapture).not.toHaveBeenCalled();
      } finally {
        mockNative[method] = original;
      }
    }
  );

  it.each([
    -1,
    NaN,
    Infinity,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
    '0',
    null,
    undefined,
  ])('rejects unsafe socket IDs %#', (id) => {
    expect(webSocketNativeID({ _socketId: id })).toBeUndefined();
  });
  it('reads RN socket ID zero safely', () => {
    expect(webSocketNativeID({ _socketId: 0 })).toBe(0);
    expect(
      webSocketNativeID(
        Object.defineProperty({}, '_socketId', {
          get() {
            throw new Error('getter');
          },
        })
      )
    ).toBeUndefined();
  });
});
