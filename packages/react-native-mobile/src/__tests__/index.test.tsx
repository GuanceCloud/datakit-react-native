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
};

const mockFTReactNativeLog = {
  logConfig: jest.fn().mockResolvedValue(undefined),
};

const mockFTReactNativeTrace = {
  setConfig: jest.fn().mockResolvedValue(undefined),
};

const mockNativeModules = {
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
    expect(mockFTReactNativeRUM.setConfig).toHaveBeenCalledWith(config);
  });

  it('enables iOS WebSocket tracking with native resource collection', async () => {
    const startTracking = jest
      .spyOn(FTRumWebSocketTracking, 'startTracking')
      .mockImplementation();
    const stopTracking = jest
      .spyOn(FTRumWebSocketTracking, 'stopTracking')
      .mockImplementation();

    await FTReactNativeRUM.setConfig({
      androidAppId: 'android-app-id',
      iOSAppId: 'ios-app-id',
      enableNativeUserResource: true,
    });

    expect(startTracking).toHaveBeenCalledTimes(1);
    expect(startTracking).toHaveBeenCalledWith(FTReactNativeRUM);
    expect(stopTracking).not.toHaveBeenCalled();
  });

  it.each([
    ['the switch is disabled on iOS', 'ios', false],
    ['native resource collection is enabled on Android', 'android', true],
  ])(
    'does not enable JS WebSocket tracking when %s',
    async (_, os, enabled) => {
      mockPlatform.OS = os;
      const startTracking = jest
        .spyOn(FTRumWebSocketTracking, 'startTracking')
        .mockImplementation();
      const stopTracking = jest
        .spyOn(FTRumWebSocketTracking, 'stopTracking')
        .mockImplementation();

      await FTReactNativeRUM.setConfig({
        androidAppId: 'android-app-id',
        iOSAppId: 'ios-app-id',
        enableNativeUserResource: enabled,
      });

      expect(startTracking).not.toHaveBeenCalled();
      expect(stopTracking).toHaveBeenCalledTimes(1);
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
