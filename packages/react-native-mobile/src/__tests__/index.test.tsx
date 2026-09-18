const mockNativeEventEmitterAddListener = jest.fn();
const mockPlatform = { OS: 'ios' };

const mockFTMobileReactNative = {
  sdkConfig: jest.fn().mockResolvedValue(undefined),
  setDatakitURL: jest.fn().mockResolvedValue(undefined),
  setDatawayURL: jest.fn().mockResolvedValue(undefined),
  bindRUMUserData: jest.fn().mockResolvedValue(undefined),
  unbindRUMUserData: jest.fn().mockResolvedValue(undefined),
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
  setConfig: jest.fn().mockResolvedValue(undefined),
  setLongTaskContext: jest.fn().mockReturnValue(true),
  stopLongTaskTracking: jest.fn().mockResolvedValue(undefined),
};

const mockFTReactNativeLog = {
  logConfig: jest.fn().mockResolvedValue(undefined),
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
        override: { logSampleRate: 1 },
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
        { duration: 25000000 },
        session
      );
      expect(mockFTReactNativeRUM.setConfig).toHaveBeenLastCalledWith({
        ...config,
        enableLongTask: false,
        longTaskThresholdMs: 100,
      });
    } finally {
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
