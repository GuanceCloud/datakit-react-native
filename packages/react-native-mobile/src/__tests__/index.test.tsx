const mockNativeEventEmitterAddListener = jest.fn();
const mockPlatform = { OS: 'ios' };

const mockFTMobileReactNative = {
  sdkConfig: jest.fn().mockResolvedValue(undefined),
  setDatakitURL: jest.fn().mockResolvedValue(undefined),
  setDatawayURL: jest.fn().mockResolvedValue(undefined),
  bindRUMUserData: jest.fn().mockResolvedValue(undefined),
  unbindRUMUserData: jest.fn().mockResolvedValue(undefined),
  resetVisitorId: jest.fn().mockResolvedValue(undefined),
  appendGlobalContext: jest.fn().mockResolvedValue(undefined),
  appendRUMGlobalContext: jest.fn().mockResolvedValue(undefined),
  appendLogGlobalContext: jest.fn().mockResolvedValue(undefined),
  flushSyncData: jest.fn().mockResolvedValue(undefined),
  trackEventFromExtension: jest.fn().mockResolvedValue(undefined),
  shutDown: jest.fn().mockResolvedValue(undefined),
  clearAllData: jest.fn().mockResolvedValue(undefined),
  updateRemoteConfig: jest.fn().mockResolvedValue(undefined),
  updateRemoteConfigWithMiniUpdateInterval: jest
    .fn()
    .mockResolvedValue(undefined),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};

const mockFTReactNativeRUM = {
  onCreateView: jest.fn().mockResolvedValue(undefined),
  updateViewLoadingTime: jest.fn().mockResolvedValue(undefined),
  onCreateViewWithLoadStart: jest.fn().mockResolvedValue(undefined),
  startView: jest.fn().mockResolvedValue(undefined),
  startViewWithTrackingType: jest.fn().mockResolvedValue(undefined),
  setConfig: jest.fn().mockResolvedValue(undefined),
  setLongTaskContext: jest.fn().mockReturnValue(true),
  stopLongTaskTracking: jest.fn().mockResolvedValue(undefined),
};

const mockFTReactNativeLog = {
  logConfig: jest.fn().mockResolvedValue(undefined),
};

const mockFTReactNativeSessionReplay = {
  sessionReplayConfig: jest.fn().mockResolvedValue(undefined),
};

const mockFTReactNativeTrace = {
  setConfig: jest.fn().mockResolvedValue(undefined),
  getTraceHeaderFieldsSync: jest.fn().mockReturnValue({}),
};

const mockWebSocketMetadata = {
  startCapture: jest.fn().mockResolvedValue(undefined),
  stopCapture: jest.fn().mockResolvedValue(undefined),
  startResource: jest.fn().mockResolvedValue(undefined),
  stopResource: jest.fn().mockResolvedValue(undefined),
  addResource: jest.fn().mockResolvedValue(undefined),
  releaseResource: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
};

const mockNativeModules = {
  FTReactNativeWebSocket: mockWebSocketMetadata,
  FTMobileReactNative: mockFTMobileReactNative,
  FTReactNativeRUM: mockFTReactNativeRUM,
  FTReactNativeLog: mockFTReactNativeLog,
  FTReactNativeSessionReplay: mockFTReactNativeSessionReplay,
  FTReactNativeTrace: mockFTReactNativeTrace,
};

jest.mock('react-native', () => ({
  NativeModules: mockNativeModules,
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: mockNativeEventEmitterAddListener,
  })),
  Platform: mockPlatform,
  TurboModuleRegistry: {
    get: jest.fn(
      (name: keyof typeof mockNativeModules) => mockNativeModules[name]
    ),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FTMobileReactNative } = require('../ft_mobile_agent');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FTReactNativeRUM } = require('../ft_rum');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FTReactNativeLog } = require('../ft_logger');
/* eslint-disable @typescript-eslint/no-var-requires */
const {
  FTReactNativeSessionReplay,
} = require('../../../react-native-session-replay/src/ft_session_replay');
/* eslint-enable @typescript-eslint/no-var-requires */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FTReactNativeTrace } = require('../ft_tracing');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FTRumWebSocketTracking } = require('../rum/FTRumWebSocketTracking');

describe('FTMobileReactNative upload endpoint APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards setDatakitURL to the native module', async () => {
    const datakitUrl = 'http://10.0.0.1:9529';

    await FTMobileReactNative.setDatakitURL(datakitUrl);

    expect(mockFTMobileReactNative.setDatakitURL).toHaveBeenCalledTimes(1);
    expect(mockFTMobileReactNative.setDatakitURL).toHaveBeenCalledWith(
      datakitUrl
    );
  });

  it('forwards setDatawayURL and clientToken to the native module', async () => {
    const datawayUrl = 'https://openway.guance.com';
    const clientToken = 'client-token';

    await FTMobileReactNative.setDatawayURL(datawayUrl, clientToken);

    expect(mockFTMobileReactNative.setDatawayURL).toHaveBeenCalledTimes(1);
    expect(mockFTMobileReactNative.setDatawayURL).toHaveBeenCalledWith(
      datawayUrl,
      clientToken
    );
  });

  it('forwards data filter config to the native module', async () => {
    const config = {
      datawayUrl: 'https://openway.guance.com',
      clientToken: 'client-token',
      enableDataFilter: false,
      dataFilters: {
        logging: [
          "{ `source` in [ 'df_rum_ios_log' , 'df_rum_android_log' ] and `message` match [ 'timeout' ] }",
        ],
      },
    };

    await FTMobileReactNative.sdkConfig(config);

    expect(mockFTMobileReactNative.sdkConfig).toHaveBeenCalledTimes(1);
    expect(mockFTMobileReactNative.sdkConfig).toHaveBeenCalledWith(config);
  });
});

describe('FTMobileReactNative remote configuration APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards manual remote configuration updates to the native module', async () => {
    await FTMobileReactNative.updateRemoteConfig();

    expect(mockFTMobileReactNative.updateRemoteConfig).toHaveBeenCalledTimes(1);
  });

  it('forwards the update interval and override rules to the native module', async () => {
    const rules = [
      {
        id: 'force-log-sampling',
        match: { customKeys: { user_tier: 'internal' } },
        override: {
          logSampleRate: 1,
          logSamplingRate: 0.1,
          sessionSamplingRate: 0,
          sessionOnErrorSamplingRate: 12.5,
          traceSamplingRate: 100,
          sessionReplaySamplingRate: 12.5,
          sessionReplayOnErrorSamplingRate: 0,
        },
      },
    ];

    await FTMobileReactNative.updateRemoteConfigWithMiniUpdateInterval(
      0,
      rules
    );

    expect(
      mockFTMobileReactNative.updateRemoteConfigWithMiniUpdateInterval
    ).toHaveBeenCalledWith(0, rules);
  });

  it('subscribes to automatic remote configuration callbacks', () => {
    const listener = jest.fn();

    FTMobileReactNative.addRemoteConfigListener(listener);

    expect(mockNativeEventEmitterAddListener).toHaveBeenCalledWith(
      'ft_remote_config_callback',
      listener
    );
  });
});

describe('NativeFTMobileReactNative TurboModule contract', () => {
  it('declares every method required by remote configuration', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ts = require('typescript');
    const specPath = path.resolve(
      __dirname,
      '../specs/NativeFTMobileReactNative.ts'
    );
    const source = ts.createSourceFile(
      specPath,
      fs.readFileSync(specPath, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
    const spec = source.statements.find(
      (statement: { name?: { text?: string } }) =>
        ts.isInterfaceDeclaration(statement) && statement.name.text === 'Spec'
    );
    const methodNames = spec.members
      .filter((member: unknown) => ts.isMethodSignature(member))
      .map((member: { name: { getText: (sourceFile: unknown) => string } }) =>
        member.name.getText(source)
      );

    expect(methodNames).toEqual(
      expect.arrayContaining([
        'updateRemoteConfig',
        'updateRemoteConfigWithMiniUpdateInterval',
        'addListener',
        'removeListeners',
      ])
    );
  });
});

describe('native adapter config forwarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlatform.OS = 'ios';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('forwards RUM sampling and WebView hosts to the native module', async () => {
    const config = {
      androidAppId: 'android-app-id',
      iOSAppId: 'ios-app-id',
      sampleRate: 0.75,
      allowWebViewHost: ['example.com'],
    };

    await FTReactNativeRUM.setConfig(config);

    expect(mockFTReactNativeRUM.setConfig).toHaveBeenCalledTimes(1);
    expect(mockFTReactNativeRUM.setConfig).toHaveBeenCalledWith({
      ...config,
      enableLongTask: false,
      longTaskThresholdMs: 100,
    });
  });

  it.each([true, false, undefined])(
    'enables iOS WebSocket tracking independently when native resource collection is %s',
    async (nativeResource) => {
      const startTracking = jest
        .spyOn(FTRumWebSocketTracking, 'startTracking')
        .mockImplementation();
      const stopTracking = jest
        .spyOn(FTRumWebSocketTracking, 'stopTracking')
        .mockImplementation();

      const config = {
        androidAppId: 'android-app-id',
        iOSAppId: 'ios-app-id',
        enableNativeUserResource: nativeResource,
        enableIOSWebSocketResource: true,
      };
      await FTReactNativeRUM.setConfig(config);

      expect(startTracking).toHaveBeenCalledTimes(1);
      expect(startTracking).toHaveBeenCalledWith(FTReactNativeRUM);
      expect(stopTracking).not.toHaveBeenCalled();
      expect(mockFTReactNativeRUM.setConfig).toHaveBeenCalledWith({
        ...config,
        enableLongTask: false,
        longTaskThresholdMs: 100,
      });
    }
  );

  it('reports a traced handshake through the native bridge with native resource collection disabled', async () => {
    FTRumWebSocketTracking.shutDown();
    const wall = jest.spyOn(Date, 'now').mockReturnValue(1700000000001);
    const originalWebSocket = globalThis.WebSocket;
    const performanceDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      'performance'
    );
    let now = 100;
    Object.defineProperty(globalThis, 'performance', {
      configurable: true,
      value: { now: () => now },
    });
    class TestWebSocket {
      _socketId = 7;
      listeners = new Map<string, () => void>();
      constructor(
        readonly url: string,
        readonly protocols?: string[],
        readonly options?: { headers?: Record<string, unknown> }
      ) {}
      addEventListener(type: string, listener: () => void) {
        this.listeners.set(type, listener);
      }
      removeEventListener(type: string) {
        this.listeners.delete(type);
      }
    }
    globalThis.WebSocket =
      TestWebSocket as unknown as typeof globalThis.WebSocket;
    let resolveStart!: () => void;
    mockWebSocketMetadata.startResource.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveStart = resolve;
      })
    );
    mockFTReactNativeTrace.getTraceHeaderFieldsSync.mockReturnValueOnce({
      traceparent: 'test-trace-header',
    });
    const config = {
      androidAppId: 'android-app-id',
      iOSAppId: 'ios-app-id',
      enableNativeUserResource: false,
      enableIOSWebSocketResource: true,
    };
    try {
      await FTReactNativeTrace.setConfig({ enableNativeAutoTrace: true });
      await FTReactNativeRUM.setConfig(config);
      const constructor = globalThis.WebSocket;
      const socket = new globalThis.WebSocket(
        'wss://example.com/socket'
      ) as unknown as TestWebSocket;
      expect(socket.options?.headers?.traceparent).toBe('test-trace-header');
      expect(mockWebSocketMetadata.startCapture).toHaveBeenCalledTimes(1);
      expect(mockWebSocketMetadata.startResource).toHaveBeenCalledTimes(1);

      // Toggling native HTTP collection must not retire WebSocket capture.
      await FTReactNativeRUM.setConfig({
        ...config,
        enableNativeUserResource: true,
      });
      await FTReactNativeRUM.setConfig(config);
      expect(globalThis.WebSocket).toBe(constructor);
      expect(mockWebSocketMetadata.startCapture).toHaveBeenCalledTimes(1);
      expect(mockWebSocketMetadata.stopCapture).not.toHaveBeenCalled();
      now = 125;
      socket.listeners.get('open')!();
      expect(socket.listeners.size).toBe(0);
      expect(mockWebSocketMetadata.stopResource).toHaveBeenCalledTimes(1);
      // Delayed native start acknowledgement must not extend the 25 ms handshake.
      now = 1000;
      resolveStart();
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(mockWebSocketMetadata.addResource).toHaveBeenCalledTimes(1);
      const [key, , , session] =
        mockWebSocketMetadata.startResource.mock.calls[0];
      expect(mockWebSocketMetadata.addResource).toHaveBeenCalledWith(
        key,
        expect.objectContaining({ webSocketEvent: 'open', url: socket.url }),
        {
          duration: 25000000,
          fetchStartNsTimeInterval: '1700000000001000000',
          fetchEndNsTimeInterval: '1700000000026000000',
        },
        session
      );
      expect(mockFTReactNativeRUM.setConfig).toHaveBeenLastCalledWith({
        ...config,
        enableLongTask: false,
        longTaskThresholdMs: 100,
      });
    } finally {
      wall.mockRestore();
      FTRumWebSocketTracking.shutDown();
      globalThis.WebSocket = originalWebSocket;
      if (performanceDescriptor) {
        Object.defineProperty(globalThis, 'performance', performanceDescriptor);
      } else {
        Reflect.deleteProperty(globalThis, 'performance');
      }
    }
  });

  it.each([
    ['the iOS WebSocket switch is omitted', 'ios', true, undefined],
    ['the iOS WebSocket switch is disabled', 'ios', true, false],
    ['the iOS switch is enabled on Android', 'android', true, true],
    ['the iOS switch is disabled on Android', 'android', true, false],
    ['the iOS switch is omitted on Android', 'android', true, undefined],
  ])(
    'does not enable JS WebSocket tracking when %s',
    async (_, os, nativeResource, webSocketResource) => {
      mockPlatform.OS = os;
      const startTracking = jest
        .spyOn(FTRumWebSocketTracking, 'startTracking')
        .mockImplementation();
      const stopTracking = jest
        .spyOn(FTRumWebSocketTracking, 'stopTracking')
        .mockImplementation();

      const config = {
        androidAppId: 'android-app-id',
        iOSAppId: 'ios-app-id',
        enableNativeUserResource: nativeResource,
        enableIOSWebSocketResource: webSocketResource,
      };
      await FTReactNativeRUM.setConfig(config);

      expect(startTracking).not.toHaveBeenCalled();
      expect(stopTracking).toHaveBeenCalledTimes(1);
      // The iOS-only switch must not disable HTTP or Android native collection.
      expect(mockFTReactNativeRUM.setConfig).toHaveBeenCalledWith({
        ...config,
        enableLongTask: false,
        longTaskThresholdMs: 100,
      });
    }
  );

  it.each([undefined, false])(
    'leaves the constructor, native capture and WebSocket Trace inactive when the iOS switch is %s',
    async (enabled) => {
      FTRumWebSocketTracking.shutDown();
      const originalWebSocket = globalThis.WebSocket;
      class TestWebSocket {}
      globalThis.WebSocket =
        TestWebSocket as unknown as typeof globalThis.WebSocket;
      try {
        await FTReactNativeTrace.setConfig({ enableNativeAutoTrace: true });
        await FTReactNativeRUM.setConfig({
          androidAppId: 'android-app-id',
          iOSAppId: 'ios-app-id',
          enableNativeUserResource: true,
          enableIOSWebSocketResource: enabled,
        });
        expect(globalThis.WebSocket).toBe(TestWebSocket);
        expect(
          new globalThis.WebSocket('wss://example.com/socket')
        ).toBeInstanceOf(TestWebSocket);
        expect(mockWebSocketMetadata.startCapture).not.toHaveBeenCalled();
        expect(
          mockFTReactNativeTrace.getTraceHeaderFieldsSync
        ).not.toHaveBeenCalled();
        expect(mockFTReactNativeTrace.setConfig).toHaveBeenCalledWith({
          enableNativeAutoTrace: true,
        });
      } finally {
        FTRumWebSocketTracking.shutDown();
        globalThis.WebSocket = originalWebSocket;
      }
    }
  );

  it.each([
    ['disabled defaults', undefined, undefined, false, 100],
    ['explicitly disabled', false, 250, false, 250],
    ['enabled default', true, undefined, true, 100],
    ['enabled zero', true, 0, true, 100],
    ['enabled NaN', true, Number.NaN, true, 100],
    ['enabled negative', true, -1, true, 100],
    ['enabled below minimum', true, 99.9, true, 100],
    ['enabled minimum', true, 100, true, 100],
    ['enabled fractional', true, 200.5, true, 200.5],
    ['enabled maximum', true, 5000, true, 5000],
    ['enabled above maximum', true, 5000.1, true, 5000],
    ['enabled infinity', true, Number.POSITIVE_INFINITY, true, 5000],
  ])(
    'normalizes the %s JavaScript long task configuration',
    async (
      _name,
      enableLongTask,
      threshold,
      expectedEnableLongTask,
      expectedThreshold
    ) => {
      const config = {
        androidAppId: 'android-app-id',
        iOSAppId: 'ios-app-id',
        nativeFreezeDurationMs: 750,
        enableLongTask,
        longTaskThresholdMs: threshold,
      };

      await FTReactNativeRUM.setConfig(config);

      expect(mockFTReactNativeRUM.setConfig).toHaveBeenCalledWith({
        ...config,
        enableLongTask: expectedEnableLongTask,
        longTaskThresholdMs: expectedThreshold,
      });
      expect(config.enableLongTask).toBe(enableLongTask);
      expect(config.longTaskThresholdMs).toBe(threshold);
      expect(config.nativeFreezeDurationMs).toBe(750);
    }
  );

  it('forwards Logger sampling to the native module', async () => {
    const config = {
      sampleRate: 0.5,
      enableCustomLog: true,
    };

    await FTReactNativeLog.logConfig(config);

    expect(mockFTReactNativeLog.logConfig).toHaveBeenCalledTimes(1);
    expect(mockFTReactNativeLog.logConfig).toHaveBeenCalledWith(config);
  });

  it('forwards Trace sampling to the native module', async () => {
    const config = {
      sampleRate: 0.25,
    };

    await FTReactNativeTrace.setConfig(config);

    expect(mockFTReactNativeTrace.setConfig).toHaveBeenCalledTimes(1);
    expect(mockFTReactNativeTrace.setConfig).toHaveBeenCalledWith(config);
  });

  it.each([
    ['enabled', true, true],
    ['disabled', false, false],
    ['not configured', undefined, false],
  ])(
    'sets WebSocket automatic trace injection to %s',
    async (_, configuredValue, expectedValue) => {
      const setNativeAutoTraceEnabled = jest
        .spyOn(FTRumWebSocketTracking, 'setNativeAutoTraceEnabled')
        .mockImplementation();

      await FTReactNativeTrace.setConfig({
        enableNativeAutoTrace: configuredValue,
      });

      expect(setNativeAutoTraceEnabled).toHaveBeenCalledWith(expectedValue);
    }
  );

  it('does not change WebSocket trace injection when native Trace configuration fails', async () => {
    const configurationError = new Error('Trace configuration failed');
    mockFTReactNativeTrace.setConfig.mockRejectedValueOnce(configurationError);
    const setNativeAutoTraceEnabled = jest
      .spyOn(FTRumWebSocketTracking, 'setNativeAutoTraceEnabled')
      .mockImplementation();

    await expect(
      FTReactNativeTrace.setConfig({ enableNativeAutoTrace: true })
    ).rejects.toBe(configurationError);

    expect(setNativeAutoTraceEnabled).not.toHaveBeenCalled();
  });
});

describe('FTMobileReactNative shutdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlatform.OS = 'ios';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stops JavaScript long task monitoring before shutting down the SDK', async () => {
    const calls: string[] = [];
    mockFTReactNativeRUM.stopLongTaskTracking.mockImplementationOnce(
      async () => {
        calls.push('stopLongTaskTracking');
      }
    );
    mockFTMobileReactNative.shutDown.mockImplementationOnce(async () => {
      calls.push('shutDown');
    });

    await FTMobileReactNative.shutDown();

    expect(calls).toEqual(['stopLongTaskTracking', 'shutDown']);
  });

  it('still shuts down the SDK when stopping the monitor fails', async () => {
    mockFTReactNativeRUM.stopLongTaskTracking.mockRejectedValueOnce(
      new Error('stop failed')
    );

    await expect(FTMobileReactNative.shutDown()).rejects.toThrow('stop failed');

    expect(mockFTMobileReactNative.shutDown).toHaveBeenCalledTimes(1);
  });

  it('does not let older configuration results reactivate WebSocket collection or tracing', async () => {
    let resolveRum!: () => void;
    let resolveTrace!: () => void;
    mockFTReactNativeRUM.setConfig.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveRum = resolve;
      })
    );
    mockFTReactNativeTrace.setConfig.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveTrace = resolve;
      })
    );
    const start = jest
      .spyOn(FTRumWebSocketTracking, 'startTracking')
      .mockImplementation();
    const stop = jest
      .spyOn(FTRumWebSocketTracking, 'stopTracking')
      .mockImplementation();
    const trace = jest
      .spyOn(FTRumWebSocketTracking, 'setNativeAutoTraceEnabled')
      .mockImplementation();
    const oldRum = FTReactNativeRUM.setConfig({
      iOSAppId: 'ios',
      androidAppId: 'android',
      enableNativeUserResource: false,
      enableIOSWebSocketResource: true,
    });
    const oldTrace = FTReactNativeTrace.setConfig({
      enableNativeAutoTrace: true,
    });
    await FTReactNativeRUM.setConfig({
      iOSAppId: 'ios',
      androidAppId: 'android',
      enableNativeUserResource: true,
      enableIOSWebSocketResource: false,
    });
    await FTReactNativeTrace.setConfig({ enableNativeAutoTrace: false });
    resolveRum();
    resolveTrace();
    await Promise.all([oldRum, oldTrace]);
    expect(start).not.toHaveBeenCalled();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(trace).toHaveBeenCalledTimes(1);
    expect(trace).toHaveBeenCalledWith(false);
  });

  it.each(['shutdown', 'disable'])(
    'starts JS capture immediately and ignores native setup replies after %s',
    async (action) => {
      FTRumWebSocketTracking.shutDown();
      const originalWebSocket = globalThis.WebSocket;
      class TestWebSocket {}
      globalThis.WebSocket =
        TestWebSocket as unknown as typeof globalThis.WebSocket;
      let resolveCapture!: () => void;
      mockWebSocketMetadata.startCapture.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveCapture = resolve;
        })
      );
      const start = jest.spyOn(FTRumWebSocketTracking, 'startTracking');
      const config = {
        androidAppId: 'android',
        iOSAppId: 'ios',
        enableNativeUserResource: false,
        enableIOSWebSocketResource: true,
      };
      try {
        let configured = false;
        const configuration = FTReactNativeRUM.setConfig(config).then(() => {
          configured = true;
        });
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(configured).toBe(true);
        expect(start).toHaveBeenCalledTimes(1);
        expect(globalThis.WebSocket).not.toBe(TestWebSocket);
        if (action === 'shutdown') await FTMobileReactNative.shutDown();
        else
          await FTReactNativeRUM.setConfig({
            ...config,
            enableIOSWebSocketResource: false,
          });
        expect(globalThis.WebSocket).toBe(TestWebSocket);
        resolveCapture();
        await configuration;
        await new Promise<void>((resolve) => setImmediate(resolve));
        expect(start).toHaveBeenCalledTimes(1);
        expect(globalThis.WebSocket).toBe(TestWebSocket);
        expect(mockWebSocketMetadata.stopCapture).toHaveBeenCalled();
      } finally {
        FTRumWebSocketTracking.shutDown();
        globalThis.WebSocket = originalWebSocket;
      }
    }
  );

  it('ignores RUM and Trace configuration results from before shutdown', async () => {
    let resolveRum!: () => void;
    let resolveTrace!: () => void;
    mockFTReactNativeRUM.setConfig.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveRum = resolve;
      })
    );
    mockFTReactNativeTrace.setConfig.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveTrace = resolve;
      })
    );
    const startTracking = jest
      .spyOn(FTRumWebSocketTracking, 'startTracking')
      .mockImplementation();
    const setTrace = jest
      .spyOn(FTRumWebSocketTracking, 'setNativeAutoTraceEnabled')
      .mockImplementation();
    const rumConfig = {
      androidAppId: 'android-app-id',
      iOSAppId: 'ios-app-id',
      enableNativeUserResource: false,
      enableIOSWebSocketResource: true,
    };
    const oldRumConfig = FTReactNativeRUM.setConfig(rumConfig);
    const oldTraceConfig = FTReactNativeTrace.setConfig({
      enableNativeAutoTrace: true,
    });

    await FTMobileReactNative.shutDown();
    startTracking.mockClear();
    setTrace.mockClear();
    resolveRum();
    resolveTrace();
    await Promise.all([oldRumConfig, oldTraceConfig]);
    expect(startTracking).not.toHaveBeenCalled();
    expect(setTrace).not.toHaveBeenCalled();

    await FTReactNativeRUM.setConfig(rumConfig);
    await FTReactNativeTrace.setConfig({ enableNativeAutoTrace: true });
    expect(startTracking).toHaveBeenCalledTimes(1);
    expect(setTrace).toHaveBeenCalledWith(true);
  });
});

describe('Native Adapter Logger and Session Replay configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([true, false, undefined])(
    'forwards enableWebViewLog=%s without changing RN sampling units',
    async (enableWebViewLog) => {
      const config = {
        sampleRate: 0.001,
        ...(enableWebViewLog === undefined ? {} : { enableWebViewLog }),
      };

      await FTReactNativeLog.logConfig(config);

      expect(mockFTReactNativeLog.logConfig).toHaveBeenCalledTimes(1);
      expect(mockFTReactNativeLog.logConfig).toHaveBeenCalledWith({
        sampleRate: 0.001,
        ...(enableWebViewLog === undefined ? {} : { enableWebViewLog }),
      });
    }
  );

  it.each([0, 0.001, 0.125, 1])(
    'forwards Session Replay probability %s unchanged for native conversion',
    async (rate) => {
      await FTReactNativeSessionReplay.sessionReplayConfig({
        sampleRate: rate,
        sessionReplayOnErrorSampleRate: rate,
      });

      expect(
        mockFTReactNativeSessionReplay.sessionReplayConfig
      ).toHaveBeenCalledTimes(1);
      expect(
        mockFTReactNativeSessionReplay.sessionReplayConfig
      ).toHaveBeenCalledWith({
        sampleRate: rate,
        sessionReplayOnErrorSampleRate: rate,
      });
    }
  );

  it('leaves omitted sampling fields to native defaults', async () => {
    await FTReactNativeLog.logConfig({});
    await FTReactNativeSessionReplay.sessionReplayConfig({});

    expect(mockFTReactNativeLog.logConfig).toHaveBeenCalledWith({});
    expect(
      mockFTReactNativeSessionReplay.sessionReplayConfig
    ).toHaveBeenCalledWith({});
  });
});

describe('percentage sampling configuration', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([0, 0.1, 12.5, 100])(
    'forwards %s percent across all configs',
    async (rate) => {
      const log = { logSamplingRate: rate, sampleRate: 1 };
      const rum = {
        androidAppId: 'app',
        iOSAppId: 'app',
        sessionSamplingRate: rate,
        sessionOnErrorSamplingRate: rate,
        sampleRate: 1,
        sessionOnErrorSampleRate: 1,
      };
      const trace = { traceSamplingRate: rate, sampleRate: 1 };
      const replay = {
        sessionReplaySamplingRate: rate,
        sessionReplayOnErrorSamplingRate: rate,
        sampleRate: 1,
        sessionReplayOnErrorSampleRate: 1,
      };
      await FTReactNativeLog.logConfig(log);
      await FTReactNativeRUM.setConfig(rum);
      await FTReactNativeTrace.setConfig(trace);
      await FTReactNativeSessionReplay.sessionReplayConfig(replay);
      expect(mockFTReactNativeLog.logConfig).toHaveBeenCalledWith(log);
      expect(mockFTReactNativeRUM.setConfig).toHaveBeenCalledWith({
        ...rum,
        enableLongTask: false,
        longTaskThresholdMs: 100,
      });
      expect(mockFTReactNativeTrace.setConfig).toHaveBeenCalledWith(trace);
      expect(
        mockFTReactNativeSessionReplay.sessionReplayConfig
      ).toHaveBeenCalledWith(replay);
    }
  );
});

describe('Visitor ID configuration', () => {
  beforeEach(() => jest.clearAllMocks());
  const base = { androidAppId: 'app', iOSAppId: 'app' };
  it('forwards declarative rules without changing lifetime units', async () => {
    const visitorIdConfig = {
      header: 'x-visitor-id',
      ttlHours: 0.5,
      urlPrefixes: ['https://api.example.com/v1/'],
      regularExpressions: ['^https://api\\.example\\.com/orders/'],
    };
    await FTReactNativeRUM.setConfig({ ...base, visitorIdConfig });
    expect(mockFTReactNativeRUM.setConfig).toHaveBeenCalledWith(
      expect.objectContaining({ visitorIdConfig })
    );
  });
  it.each([undefined, null])(
    'allows disabled config %s',
    async (visitorIdConfig) => {
      await FTReactNativeRUM.setConfig({ ...base, visitorIdConfig });
      expect(mockFTReactNativeRUM.setConfig).toHaveBeenCalledWith(
        expect.objectContaining({ visitorIdConfig })
      );
    }
  );
  it.each([
    { header: 'X-Visitor-Id', urlPrefixes: ['https://example.com/'] },
    { header: 'x-visitor-id\n', urlPrefixes: ['https://example.com/'] },
    { header: 'authorization', urlPrefixes: ['https://example.com/'] },
    { header: 'x-api-key', urlPrefixes: ['https://example.com/'] },
    { header: 'traceparent', urlPrefixes: ['https://example.com/'] },
    { header: 'x-visitor-id' },
    { header: 'x-visitor-id', urlPrefixes: [] },
    { header: 'x-visitor-id', urlPrefixes: ['wss://example.com/'] },
    { header: 'x-visitor-id', regularExpressions: [''] },
    ...[0, -1, NaN, Infinity, 1e20].map((ttlHours) => ({
      header: 'x-visitor-id',
      ttlHours,
      urlPrefixes: ['https://example.com/'],
    })),
  ])(
    'rejects invalid config before configuring native RUM: %j',
    async (visitorIdConfig) => {
      await expect(
        FTReactNativeRUM.setConfig({ ...base, visitorIdConfig })
      ).rejects.toThrow();
      expect(mockFTReactNativeRUM.setConfig).not.toHaveBeenCalled();
    }
  );
  it('resets through the native SDK', async () => {
    await FTMobileReactNative.resetVisitorId();
    expect(mockFTMobileReactNative.resetVisitorId).toHaveBeenCalledTimes(1);
  });
});

describe('public View APIs', () => {
  beforeEach(() => jest.clearAllMocks());
  it('updates the current View with exact nanoseconds, including zero', async () => {
    await FTReactNativeRUM.updateViewLoadingTime(25500000);
    await FTReactNativeRUM.updateViewLoadingTime(0);
    await FTReactNativeRUM.updateViewLoadingTime(Number.MAX_SAFE_INTEGER);
    expect(mockFTReactNativeRUM.updateViewLoadingTime.mock.calls).toEqual([
      [25500000],
      [0],
      [9007199254740991],
    ]);
    expect(mockFTReactNativeRUM.onCreateView).not.toHaveBeenCalled();
    expect(mockFTReactNativeRUM.startView).not.toHaveBeenCalled();
  });
  it.each([-1, NaN, Infinity, -Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid loading duration %s without overwriting the current value',
    async (duration) => {
      await expect(
        FTReactNativeRUM.updateViewLoadingTime(duration)
      ).rejects.toThrow(
        'duration must be a non-negative safe integer in nanoseconds'
      );
      expect(mockFTReactNativeRUM.updateViewLoadingTime).not.toHaveBeenCalled();
    }
  );
  it('propagates native update failures to the caller', async () => {
    const error = new Error('native update failed');
    mockFTReactNativeRUM.updateViewLoadingTime.mockRejectedValueOnce(error);
    await expect(FTReactNativeRUM.updateViewLoadingTime(25500000)).rejects.toBe(
      error
    );
  });
  it('keeps manual start and loading on their existing native APIs', async () => {
    await FTReactNativeRUM.onCreateView('Home', 25000000);
    await FTReactNativeRUM.startView('Home', { screen: 'home' });
    expect(mockFTReactNativeRUM.onCreateView).toHaveBeenCalledWith(
      'Home',
      25000000
    );
    expect(mockFTReactNativeRUM.startView).toHaveBeenCalledWith(
      'Home',
      expect.objectContaining({ screen: 'home' })
    );
    expect(
      mockFTReactNativeRUM.onCreateViewWithLoadStart
    ).not.toHaveBeenCalled();
    expect(
      mockFTReactNativeRUM.startViewWithTrackingType
    ).not.toHaveBeenCalled();
  });
  it('does not expose framework bridge methods or a tracking type enum', () => {
    expect(FTReactNativeRUM).not.toHaveProperty('onCreateViewWithLoadStart');
    expect(FTReactNativeRUM).not.toHaveProperty('startViewWithTrackingType');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    expect(require('../index')).not.toHaveProperty('FTRUMViewTrackingType');
  });
});
