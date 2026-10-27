const mockRUM = {
  onCreateView: jest.fn().mockResolvedValue(undefined),
  startView: jest.fn().mockResolvedValue(undefined),
  stopView: jest.fn().mockResolvedValue(undefined),
};
const mockNativeRUM = {
  onCreateViewWithLoadStart: jest.fn().mockResolvedValue(undefined),
  startViewWithTrackingType: jest.fn().mockResolvedValue(undefined),
};
jest.mock(
  '../../../react-native-mobile/src/specs/NativeFTReactNativeRUM',
  () => ({
    default: mockNativeRUM,
  })
);
jest.mock('../../../react-native-mobile/src/ft_mobile_agent', () => ({
  bridgeContextManager: {
    mergeWithLocalPropertiesSync: () => ({ context: 'global' }),
  },
}));
const mockAppState = {
  currentState: 'active',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};
jest.mock('../../../react-native-mobile/src/ft_rum', () => ({
  FTReactNativeRUM: mockRUM,
}));
jest.mock('react-native', () => ({ AppState: mockAppState }));
jest.mock(
  '@cloudcare/react-native-mobile',
  () => ({
    FTReactNativeRUM: mockRUM,
    // Load the real coordinator when testing the updated adapters.
    get FTRumViewTracking() {
      return jest.requireActual(
        '../../../react-native-mobile/src/rum/FTRumViewTracking'
      ).FTRumViewTracking;
    },
  }),
  { virtual: true }
);

describe('React Navigation automatic View lifecycle', () => {
  let tracker: any;
  let change: (state: string) => void;
  let monotonic = 100;
  const home = { key: 'home-1', name: 'Home' };
  const detail = { key: 'detail-1', name: 'Detail' };
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockAppState.currentState = 'active';
    mockAppState.addEventListener.mockImplementation((_name, listener) => {
      change = listener;
      return { remove: jest.fn() };
    });
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    jest.spyOn(performance, 'now').mockImplementation(() => monotonic);
    monotonic = 100;
    tracker = jest.requireActual('../index').FTRumReactNavigationTracking;
  });
  afterEach(() => {
    tracker.stopTrackingViews();
    jest.restoreAllMocks();
  });
  const state = (route: object) => ({
    data: { state: { routes: [route], index: 0 } },
  });

  it('uses Automatic and does not send a second background stop or replay loading on resume', () => {
    const ref = {
      getCurrentRoute: () => home,
      addListener: jest.fn().mockReturnValue(jest.fn()),
      removeListener: jest.fn(),
    };
    tracker.startTrackingViews(ref);
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenLastCalledWith(
      'Home',
      { context: 'global' },
      1
    );
    change('background');
    expect(mockRUM.stopView).not.toHaveBeenCalled();
    change('active');
    change('active');
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(2);
    expect(mockNativeRUM.onCreateViewWithLoadStart).not.toHaveBeenCalled();
  });

  it('captures the epoch at transition start and uses monotonic elapsed nanoseconds', () => {
    tracker.StackListener.focus({ target: detail.key });
    monotonic = 110; // delayed state processing must not shift the loading start
    tracker.StackListener.state(state(detail));
    monotonic = 125.5;
    (Date.now as jest.Mock).mockReturnValue(1699999999000); // wall clock rolled back
    tracker.StackListener.transitionEnd({
      target: detail.key,
      data: { closing: false },
    });
    expect(mockNativeRUM.onCreateViewWithLoadStart).toHaveBeenCalledWith(
      'Detail',
      25500000,
      1700000000000
    );
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledWith(
      'Detail',
      { context: 'global' },
      1
    );
    tracker.StackListener.transitionEnd({
      target: detail.key,
      data: { closing: false },
    });
    expect(mockNativeRUM.onCreateViewWithLoadStart).toHaveBeenCalledTimes(1);
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(1);
  });

  it('does not end loading early when state is repeated before transition completion', () => {
    const listeners = tracker.StackListener;
    listeners.focus({ target: detail.key });
    monotonic = 110;
    listeners.state(state(detail));
    monotonic = 120;
    listeners.state(state(detail));
    expect(mockNativeRUM.startViewWithTrackingType).not.toHaveBeenCalled();
    monotonic = 150;
    listeners.transitionEnd({ target: detail.key, data: { closing: false } });
    expect(mockNativeRUM.onCreateViewWithLoadStart.mock.calls).toEqual([
      ['Detail', 50000000, 1700000000000],
    ]);
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(1);
  });

  it('ignores queued stack callbacks after disposal', () => {
    const listeners = tracker.StackListener;
    listeners.focus({ target: detail.key });
    listeners.state(state(detail));
    tracker.stopTrackingViews(null);
    mockNativeRUM.startViewWithTrackingType.mockClear();
    monotonic = 150;
    listeners.transitionEnd({ target: detail.key, data: { closing: false } });
    listeners.focus({ target: home.key });
    listeners.state(state(home));
    listeners.transitionEnd({ target: home.key, data: { closing: false } });
    expect(mockNativeRUM.startViewWithTrackingType).not.toHaveBeenCalled();
  });

  it('subscribes once, switches containers, and rejects callbacks from the old registration', () => {
    let route = home;
    const oldRemove = jest.fn();
    const first = {
      getCurrentRoute: () => route,
      addListener: jest.fn().mockReturnValue(oldRemove),
    };
    tracker.startTrackingViews(null);
    tracker.startTrackingViews(first);
    tracker.startTrackingViews(first);
    expect(first.addListener).toHaveBeenCalledTimes(1);
    const oldListener = first.addListener.mock.calls[0][1];
    const second = {
      getCurrentRoute: () => detail,
      addListener: jest.fn().mockReturnValue(jest.fn()),
    };
    tracker.startTrackingViews(second);
    expect(oldRemove).toHaveBeenCalledTimes(1);
    tracker.stopTrackingViews(first);
    route = { key: 'late', name: 'Late' };
    oldListener({ data: { state: undefined } });
    expect(mockNativeRUM.startViewWithTrackingType.mock.calls).toEqual([
      ['Home', { context: 'global' }, 1],
      ['Detail', { context: 'global' }, 1],
    ]);
    expect(second.addListener.mock.results[0].value).not.toHaveBeenCalled();
    tracker.stopTrackingViews(second);
    expect(second.addListener.mock.results[0].value).toHaveBeenCalledTimes(1);
  });

  it('ignores stale stack callbacks after restarting and allows a fresh listener set', () => {
    const old = tracker.StackListener;
    tracker.stopTrackingViews();
    const fresh = tracker.StackListener;
    old.focus({ target: home.key });
    old.state(state(home));
    old.transitionEnd({ target: home.key });
    expect(mockNativeRUM.startViewWithTrackingType).not.toHaveBeenCalled();
    fresh.focus({ target: detail.key });
    monotonic = 140;
    fresh.state(state(detail));
    monotonic = 150;
    fresh.transitionEnd({ target: detail.key });
    expect(mockNativeRUM.onCreateViewWithLoadStart).toHaveBeenCalledWith(
      'Detail',
      50000000,
      1700000000000
    );
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(1);
  });

  it('tracks the innermost route and tab changes without inventing a load boundary', () => {
    tracker.StackListener.state(
      state({
        key: 'outer',
        name: 'Tabs',
        state: { index: 1, routes: [home, detail] },
      })
    );
    tracker.StackListener.state(
      state({
        key: 'outer',
        name: 'Tabs',
        state: { index: 0, routes: [home, detail] },
      })
    );
    tracker.StackListener.state({ data: { state: { routes: [], index: 0 } } });
    expect(mockNativeRUM.startViewWithTrackingType.mock.calls).toEqual([
      ['Detail', { context: 'global' }, 1],
      ['Home', { context: 'global' }, 1],
    ]);
    expect(mockNativeRUM.onCreateViewWithLoadStart).not.toHaveBeenCalled();
  });

  it('drops loading across background and ignores a late transition close after resume', () => {
    tracker.StackListener.focus({ target: detail.key });
    tracker.StackListener.state(state(detail));
    change('background');
    monotonic = 500;
    change('active');
    tracker.StackListener.transitionEnd({
      target: detail.key,
      data: { closing: false },
    });
    tracker.StackListener.transitionEnd({
      target: home.key,
      data: { closing: true },
    });
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(1);
    expect(mockNativeRUM.onCreateViewWithLoadStart).not.toHaveBeenCalled();
    expect(mockRUM.stopView).not.toHaveBeenCalled();
  });
});
