/* eslint-disable @typescript-eslint/no-var-requires */

const mockNativeRum = {
  addAction: jest.fn().mockResolvedValue(undefined),
  setConfig: jest.fn().mockResolvedValue(undefined),
  startAction: jest.fn().mockResolvedValue(undefined),
};

jest.mock('react-native', () => ({
  TurboModuleRegistry: {
    get: jest.fn(() => mockNativeRum),
  },
}));

jest.mock('../ft_mobile_agent', () => ({
  bridgeContextManager: {
    mergeWithLocalPropertiesSync: jest.fn((property?: object) => property),
  },
}));

const { FTReactNativeRUM } = require('../ft_rum');
const { FTRumActionTracking } = require('../rum/FTRumActionTracking');
const {
  FTBabelInteractionTracking,
} = require('../rum/FTBabelInteractionTracking');
const React = require('react');

const config = {
  androidAppId: 'android-app-id',
  iOSAppId: 'ios-app-id',
  enableAutoTrackUserAction: true,
};

describe('FTReactNativeRUM Babel tracker selection', () => {
  let startTracking: jest.SpyInstance;
  let stopTracking: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    delete globalThis.__FT_RN_BABEL_PLUGIN_ENABLED__;
    startTracking = jest
      .spyOn(FTRumActionTracking, 'startTracking')
      .mockImplementation(() => {});
    stopTracking = jest
      .spyOn(FTRumActionTracking, 'stopTracking')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    startTracking.mockRestore();
    stopTracking.mockRestore();
  });

  it('keeps the legacy tracker when the Babel plugin is absent', async () => {
    await FTReactNativeRUM.setConfig(config);

    expect(startTracking).toHaveBeenCalledTimes(1);
    expect(stopTracking).not.toHaveBeenCalled();
    expect(mockNativeRum.setConfig).toHaveBeenCalledWith(config);
  });

  it('uses only Babel tracking when the plugin flag is present', async () => {
    globalThis.__FT_RN_BABEL_PLUGIN_ENABLED__ = true;
    await FTReactNativeRUM.setConfig(config);

    expect(startTracking).not.toHaveBeenCalled();
    expect(stopTracking).toHaveBeenCalledTimes(1);

    const wrapped = FTBabelInteractionTracking.wrapRumAction(jest.fn(), 'TAP', {
      'componentName': 'Button',
      'options': { useContent: true, useNamePrefix: false },
      'ft-action-name': ['Checkout'],
    });
    wrapped();

    expect(mockNativeRum.startAction).toHaveBeenCalledWith(
      'Checkout',
      'click',
      undefined
    );
  });

  it('stops automatic trackers when interaction tracking is disabled', async () => {
    await FTReactNativeRUM.setConfig({
      ...config,
      enableAutoTrackUserAction: false,
    });

    expect(startTracking).not.toHaveBeenCalled();
    expect(stopTracking).toHaveBeenCalledTimes(1);
  });
});

describe('legacy action tracker lifecycle', () => {
  const initialCreateElement = React.createElement;
  const initialMemo = React.memo;

  afterEach(() => {
    FTRumActionTracking.stopTracking();
    React.createElement = initialCreateElement;
    React.memo = initialMemo;
  });

  it('does not replace a React patch when tracking was never started', () => {
    const externalCreateElement = jest.fn();
    React.createElement = externalCreateElement;

    FTRumActionTracking.stopTracking();

    expect(React.createElement).toBe(externalCreateElement);
  });

  it('restores the React patch that existed when tracking started', () => {
    const externalCreateElement = jest.fn();
    React.createElement = externalCreateElement;

    FTRumActionTracking.startTracking();
    FTRumActionTracking.stopTracking();

    expect(React.createElement).toBe(externalCreateElement);
  });
});
