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
    addListener: jest.fn(),
  })),
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

describe('native adapter config forwarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
