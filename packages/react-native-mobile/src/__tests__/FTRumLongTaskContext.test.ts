const mockRUM = {
  setConfig: jest.fn().mockResolvedValue(undefined),
  setLongTaskContext: jest.fn().mockReturnValue(true),
  stopLongTaskTracking: jest.fn().mockResolvedValue(undefined),
};
const mockSDK = { shutDown: jest.fn().mockResolvedValue(undefined) };
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  TurboModuleRegistry: {
    get: (name: string) => (name === 'FTReactNativeRUM' ? mockRUM : mockSDK),
  },
}));
jest.mock('../rum/FTRumWebSocketTracking', () => ({
  FTRumWebSocketTracking: {
    getLifecycleVersion: () => 0,
    stopTracking: jest.fn(),
    shutDown: jest.fn(),
  },
}));
jest.mock('../rum/FTRumActionTracking', () => ({
  FTRumActionTracking: { stopTracking: jest.fn() },
}));
jest.mock('../rum/FTBabelInteractionTracking', () => ({
  FTBabelInteractionTracking: { configure: jest.fn() },
}));

describe('JS long task bridge context', () => {
  let sdk: typeof import('../ft_mobile_agent').FTMobileReactNative;
  let rum: typeof import('../ft_rum').FTReactNativeRUM;
  let bridgeContextManager: typeof import('../ft_mobile_agent').bridgeContextManager;
  let version: string;
  const config = {
    androidAppId: 'android',
    iOSAppId: 'ios',
    enableLongTask: true,
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockRUM.setLongTaskContext.mockReturnValue(true);
    mockRUM.setConfig.mockResolvedValue(undefined);
    const sdkModule =
      jest.requireActual<typeof import('../ft_mobile_agent')>(
        '../ft_mobile_agent'
      );
    sdk = sdkModule.FTMobileReactNative;
    bridgeContextManager = sdkModule.bridgeContextManager;
    rum =
      jest.requireActual<typeof import('../ft_rum')>(
        '../ft_rum'
      ).FTReactNativeRUM;
    version =
      jest.requireActual<typeof import('../version')>('../version').version;
  });

  it('sends SDK version and preconfigured custom context before enabling the monitor', async () => {
    sdk.appendBridgeContext({ wgt_id: 'first' });
    await rum.setConfig(config);
    expect(mockRUM.setLongTaskContext).toHaveBeenCalledWith({
      sdk_bridge_info: JSON.stringify({ react_native: version }),
      wgt_id: 'first',
    });
    expect(mockRUM.setLongTaskContext.mock.invocationCallOrder[0]).toBeLessThan(
      mockRUM.setConfig.mock.invocationCallOrder[0]
    );
  });

  it('synchronizes appended values immediately, preserving unrelated properties', async () => {
    sdk.appendBridgeContext({ wgt_id: 'first', retained: 7 });
    await rum.setConfig(config);
    sdk.appendBridgeContext({ wgt_id: 'second' });
    expect(mockRUM.setLongTaskContext).toHaveBeenLastCalledWith({
      sdk_bridge_info: JSON.stringify({ react_native: version }),
      wgt_id: 'second',
      retained: 7,
    });
  });

  it('does not overwrite newer context when initialization completes late', async () => {
    let complete!: () => void;
    mockRUM.setConfig.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        complete = resolve;
      })
    );
    const pending = rum.setConfig(config);
    sdk.appendBridgeContext({ wgt_id: 'during-init' });
    complete();
    await pending;
    expect(mockRUM.setLongTaskContext).toHaveBeenCalledTimes(2);
    expect(mockRUM.setLongTaskContext).toHaveBeenLastCalledWith({
      sdk_bridge_info: JSON.stringify({ react_native: version }),
      wgt_id: 'during-init',
    });
  });

  it('stops synchronizing after shutdown and uses latest context on reconfiguration', async () => {
    await rum.setConfig(config);
    await sdk.shutDown();
    mockRUM.setLongTaskContext.mockClear();
    sdk.appendBridgeContext({ wgt_id: 'after-shutdown' });
    expect(mockRUM.setLongTaskContext).not.toHaveBeenCalled();
    await rum.setConfig(config);
    expect(mockRUM.setLongTaskContext).toHaveBeenCalledWith({
      sdk_bridge_info: JSON.stringify({ react_native: version }),
      wgt_id: 'after-shutdown',
    });
  });

  it('does not synchronize context when long task collection is disabled', async () => {
    await rum.setConfig({ ...config, enableLongTask: false });
    sdk.appendBridgeContext({ wgt_id: 'disabled' });
    expect(mockRUM.setLongTaskContext).not.toHaveBeenCalled();
  });

  it('does not let an unavailable native bridge break appendBridgeContext', async () => {
    await rum.setConfig(config);
    const warning = jest.spyOn(console, 'warn').mockImplementation();
    mockRUM.setLongTaskContext.mockImplementationOnce(() => {
      throw new Error('Bridge unavailable');
    });
    expect(() => sdk.appendBridgeContext({ wgt_id: 'updated' })).not.toThrow();
    expect(bridgeContextManager.mergeWithLocalPropertiesSync()).toEqual({
      sdk_bridge_info: JSON.stringify({ react_native: version }),
      wgt_id: 'updated',
    });
    warning.mockRestore();
  });
});
