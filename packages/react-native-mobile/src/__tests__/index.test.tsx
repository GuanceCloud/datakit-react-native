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

jest.mock('react-native', () => ({
  NativeModules: {
    FTMobileReactNative: mockFTMobileReactNative,
  },
  NativeEventEmitter: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(),
  })),
  TurboModuleRegistry: {
    get: jest.fn(() => mockFTMobileReactNative),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FTMobileReactNative } = require('../ft_mobile_agent');

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
});
