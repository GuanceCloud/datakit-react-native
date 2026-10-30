const mockRUM = {
  onCreateView: jest.fn().mockResolvedValue(undefined),
  startView: jest.fn().mockResolvedValue(undefined),
  stopView: jest.fn().mockResolvedValue(undefined),
  updateViewLoadingTime: jest.fn().mockResolvedValue(undefined),
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

  it('uses the start and end clocks even when state processing and wall time change', () => {
    const listeners = tracker.StackListener;
    listeners.focus({ target: detail.key });
    monotonic = 110;
    listeners.state(state(detail));
    monotonic = 125.5;
    (Date.now as jest.Mock).mockReturnValue(1699999999000);
    listeners.transitionEnd({ target: detail.key, data: { closing: false } });
    expect(mockRUM.updateViewLoadingTime.mock.calls).toEqual([[25500000]]);
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledWith(
      'Detail',
      { context: 'global' },
      1
    );
    listeners.transitionEnd({ target: detail.key, data: { closing: false } });
    expect(mockRUM.updateViewLoadingTime).toHaveBeenCalledTimes(1);
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(1);
  });

  it('does not end loading early when state repeats before transition completion', () => {
    const listeners = tracker.StackListener;
    listeners.focus({ target: detail.key });
    monotonic = 110;
    listeners.state(state(detail));
    monotonic = 120;
    listeners.state(state(detail));
    expect(mockRUM.updateViewLoadingTime).not.toHaveBeenCalled();
    monotonic = 150;
    listeners.transitionEnd({ target: detail.key, data: { closing: false } });
    expect(mockRUM.updateViewLoadingTime.mock.calls).toEqual([[50000000]]);
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
    fresh.focus({ target: detail.key });
    monotonic = 140;
    fresh.state(state(detail));
    monotonic = 150;
    fresh.transitionEnd({ target: detail.key, data: { closing: false } });
    expect(mockRUM.updateViewLoadingTime).toHaveBeenCalledWith(50000000);
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
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(2);
    expect(mockNativeRUM.onCreateViewWithLoadStart).not.toHaveBeenCalled();
    expect(mockRUM.updateViewLoadingTime).not.toHaveBeenCalled();
    expect(mockRUM.stopView).not.toHaveBeenCalled();
  });

  it('does not measure loading when an existing screen gains focus again', () => {
    const listeners = tracker.StackListener;
    listeners.focus({ target: home.key });
    listeners.state(state(home));
    listeners.transitionEnd({ target: home.key, data: { closing: false } });
    listeners.focus({ target: detail.key });
    listeners.state({ data: { state: { routes: [home, detail], index: 1 } } });
    listeners.transitionEnd({ target: detail.key, data: { closing: false } });
    mockNativeRUM.onCreateViewWithLoadStart.mockClear();
    mockRUM.updateViewLoadingTime.mockClear();
    monotonic = 500;
    listeners.focus({ target: home.key });
    listeners.focus({ target: home.key });
    listeners.state(state(home));
    monotonic = 501.375;
    listeners.transitionEnd({ target: home.key, data: { closing: false } });
    expect(mockNativeRUM.onCreateViewWithLoadStart).not.toHaveBeenCalled();
    expect(mockRUM.updateViewLoadingTime).not.toHaveBeenCalled();
    expect(
      mockNativeRUM.startViewWithTrackingType.mock.calls.map(([name]) => name)
    ).toEqual(['Home', 'Detail', 'Home']);
  });

  it('measures first appearance from focus even when transitionStart arrives later', () => {
    const listeners = tracker.StackListener;
    listeners.focus({ target: detail.key });
    listeners.state(state(detail));
    monotonic = 200;
    listeners.transitionStart({ target: detail.key, data: { closing: false } });
    monotonic = 700;
    listeners.transitionEnd({ target: detail.key, data: { closing: false } });
    expect(mockRUM.updateViewLoadingTime.mock.calls).toEqual([[600000000]]);
    expect(mockNativeRUM.onCreateViewWithLoadStart).not.toHaveBeenCalled();
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(1);
  });

  it('never assigns a parent stack transition to a nested tab', () => {
    const listeners = tracker.StackListener;
    const tabs = {
      key: 'tabs',
      name: 'Tabs',
      state: { index: 0, routes: [home, detail] },
    };
    listeners.focus({ target: tabs.key });
    listeners.focus({ target: tabs.key });
    listeners.state(state(tabs));
    monotonic = 200;
    listeners.state(state({ ...tabs, state: { ...tabs.state, index: 1 } }));
    monotonic = 600;
    listeners.transitionEnd({ target: tabs.key, data: { closing: false } });
    expect(mockRUM.updateViewLoadingTime).not.toHaveBeenCalled();
    expect(mockNativeRUM.onCreateViewWithLoadStart).not.toHaveBeenCalled();
    expect(
      mockNativeRUM.startViewWithTrackingType.mock.calls.map(([name]) => name)
    ).toEqual(['Home', 'Detail']);
  });

  it('tracks initial and non-animated routes immediately without inventing loading', () => {
    const listeners = tracker.StackListener;
    listeners.state(state(home));
    expect(
      mockNativeRUM.startViewWithTrackingType.mock.calls.map(([name]) => name)
    ).toEqual(['Home']);
    listeners.state(state(detail));
    monotonic = 500;
    listeners.transitionEnd({ target: detail.key, data: { closing: false } });
    expect(
      mockNativeRUM.startViewWithTrackingType.mock.calls.map(([name]) => name)
    ).toEqual(['Home', 'Detail']);
    expect(mockRUM.updateViewLoadingTime).not.toHaveBeenCalled();
    expect(mockNativeRUM.onCreateViewWithLoadStart).not.toHaveBeenCalled();
  });

  it('keeps the captured boundaries when both callbacks arrive before state', () => {
    const listeners = tracker.StackListener;
    listeners.focus({ target: detail.key });
    monotonic = 125.5;
    listeners.transitionEnd({ target: detail.key, data: { closing: false } });
    monotonic = 1000;
    listeners.state(state(detail));
    expect(mockRUM.updateViewLoadingTime.mock.calls).toEqual([[25500000]]);
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(1);
  });

  it('does not restart the timer on duplicate focus or report on repeated ends', () => {
    const listeners = tracker.StackListener;
    listeners.state(state(detail));
    listeners.focus({ target: detail.key });
    monotonic = 200;
    listeners.focus({ target: detail.key });
    listeners.state(state(detail));
    monotonic = 600;
    listeners.transitionEnd({ target: detail.key, data: { closing: false } });
    monotonic = 1000;
    listeners.transitionEnd({ target: detail.key, data: { closing: false } });
    expect(mockRUM.updateViewLoadingTime.mock.calls).toEqual([[500000000]]);
  });

  it.each(['gestureCancel', 'closing', 'removed', 'background', 'disposed'])(
    'discards first-load timing after %s and rejects late callbacks',
    (reason) => {
      const listeners = tracker.StackListener;
      listeners.state(state(detail));
      listeners.focus({ target: detail.key });
      if (reason === 'gestureCancel')
        listeners.gestureCancel({ target: detail.key });
      if (reason === 'closing')
        listeners.transitionStart({
          target: detail.key,
          data: { closing: true },
        });
      if (reason === 'removed') listeners.state(state(home));
      if (reason === 'background') {
        change('background');
        change('active');
      }
      if (reason === 'disposed') tracker.stopTrackingViews();
      monotonic = 600;
      listeners.transitionEnd({ target: detail.key, data: { closing: false } });
      expect(mockRUM.updateViewLoadingTime).not.toHaveBeenCalled();
      expect(mockNativeRUM.onCreateViewWithLoadStart).not.toHaveBeenCalled();
    }
  );

  it('does not apply timing to a different view while native completion is pending', async () => {
    let finish!: () => void;
    mockNativeRUM.startViewWithTrackingType.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    const listeners = tracker.StackListener;
    listeners.state(state(home));
    listeners.focus({ target: home.key });
    listeners.state(state(detail));
    monotonic = 600;
    listeners.transitionEnd({ target: home.key, data: { closing: false } });
    finish();
    await Promise.resolve();
    expect(mockRUM.updateViewLoadingTime).not.toHaveBeenCalled();
    expect(mockNativeRUM.onCreateViewWithLoadStart).not.toHaveBeenCalled();
  });

  it.each(['beforeEnd', 'afterEnd'])(
    'discards timings crossing background when state arrives %s',
    (order) => {
      const listeners = tracker.StackListener;
      listeners.focus({ target: detail.key });
      if (order === 'afterEnd') {
        monotonic = 150;
        listeners.transitionEnd({
          target: detail.key,
          data: { closing: false },
        });
      }
      change('background');
      change('active');
      if (order === 'beforeEnd') {
        monotonic = 200;
        listeners.transitionEnd({
          target: detail.key,
          data: { closing: false },
        });
      }
      listeners.state(state(detail));
      expect(mockRUM.updateViewLoadingTime).not.toHaveBeenCalled();
      expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(1);
    }
  );

  it.each([100, 50, 900100, NaN])(
    'does not report an invalid elapsed boundary at %s ms',
    (end) => {
      const listeners = tracker.StackListener;
      listeners.state(state(detail));
      listeners.focus({ target: detail.key });
      monotonic = end;
      listeners.transitionEnd({ target: detail.key, data: { closing: false } });
      expect(mockRUM.updateViewLoadingTime).not.toHaveBeenCalled();
    }
  );

  it('does not guess a start when focus has no target', () => {
    const listeners = tracker.StackListener;
    listeners.state(state(detail));
    listeners.focus({});
    monotonic = 600;
    listeners.transitionEnd({ target: detail.key, data: { closing: false } });
    expect(mockRUM.updateViewLoadingTime).not.toHaveBeenCalled();
  });

  it('reports separate first transitions for new instances with the same name', () => {
    const listeners = tracker.StackListener;
    const second = { key: 'detail-2', name: detail.name };
    listeners.state(state(detail));
    listeners.focus({ target: detail.key });
    monotonic = 600;
    listeners.transitionEnd({ target: detail.key, data: { closing: false } });
    listeners.state({
      data: { state: { routes: [detail, second], index: 1 } },
    });
    listeners.focus({ target: second.key });
    monotonic = 850;
    listeners.transitionEnd({ target: second.key, data: { closing: false } });
    listeners.state(state(detail));
    listeners.focus({ target: detail.key });
    monotonic = 1000;
    listeners.transitionEnd({ target: detail.key, data: { closing: false } });
    expect(mockRUM.updateViewLoadingTime.mock.calls).toEqual([
      [500000000],
      [250000000],
    ]);
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(3);
  });

  it('discards an incomplete end instead of timing through a later duplicate', () => {
    const listeners = tracker.StackListener;
    listeners.state(state(detail));
    listeners.focus({ target: detail.key });
    monotonic = 200;
    listeners.transitionEnd({ target: detail.key });
    monotonic = 600;
    listeners.transitionEnd({ target: detail.key, data: { closing: false } });
    expect(mockRUM.updateViewLoadingTime).not.toHaveBeenCalled();
  });

  it('does not measure a return when the first appearance had no completed interval', () => {
    const listeners = tracker.StackListener;
    listeners.focus({ target: home.key });
    listeners.state(state(home));
    listeners.focus({ target: detail.key });
    listeners.state({ data: { state: { routes: [home, detail], index: 1 } } });
    monotonic = 600;
    listeners.focus({ target: home.key });
    listeners.state(state(home));
    monotonic = 601.375;
    listeners.transitionEnd({ target: home.key, data: { closing: false } });
    expect(mockRUM.updateViewLoadingTime).not.toHaveBeenCalled();
  });

  it('releases removed route keys and clears the remaining keys on disposal', () => {
    const listeners = tracker.StackListener;
    listeners.state(state(home));
    for (let i = 0; i < 50; i++) {
      const next = { key: `detail-${i}`, name: 'Detail' };
      listeners.focus({ target: next.key });
      listeners.state({ data: { state: { routes: [home, next], index: 1 } } });
      listeners.state(state(home));
    }
    expect(Array.from(tracker.visited)).toEqual([home.key]);
    tracker.stopTrackingViews();
    expect(tracker.visited.size).toBe(0);
  });
});
