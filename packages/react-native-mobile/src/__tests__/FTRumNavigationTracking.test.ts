const mockRUM = {
  onCreateView: jest.fn().mockResolvedValue(undefined),
  startView: jest.fn().mockResolvedValue(undefined),
  stopView: jest.fn().mockResolvedValue(undefined),
};
const mockNativeRUM = {
  onCreateViewWithLoadStart: jest.fn().mockResolvedValue(undefined),
  startViewWithTrackingType: jest.fn().mockResolvedValue(undefined),
};
jest.mock('../specs/NativeFTReactNativeRUM', () => ({
  default: mockNativeRUM,
}));
jest.mock('../ft_mobile_agent', () => ({
  bridgeContextManager: {
    mergeWithLocalPropertiesSync: () => ({ context: 'global' }),
  },
}));
const mockAppState = {
  currentState: 'active',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};
jest.mock('../ft_rum', () => ({
  FTReactNativeRUM: mockRUM,
}));
jest.mock('react-native', () => ({ AppState: mockAppState }));
jest.mock(
  '@cloudcare/react-native-mobile',
  () => ({
    FTReactNativeRUM: mockRUM,
    // Load the real coordinator when testing the updated adapters.
    get FTRumViewTracking() {
      return require('../rum/FTRumViewTracking').FTRumViewTracking;
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
    jest.doMock(
      require.resolve('react-native', {
        paths: [require.resolve('../../../../example/package.json')],
      }),
      () => ({ AppState: mockAppState })
    );
    jest.doMock(
      require.resolve('@cloudcare/react-native-mobile', {
        paths: [require.resolve('../../../../example/package.json')],
      }),
      () => ({
        FTReactNativeRUM: mockRUM,
        get FTRumViewTracking() {
          return require('../rum/FTRumViewTracking').FTRumViewTracking;
        },
      })
    );
    tracker =
      require('../../../../example/src/FTRumReactNavigationTracking').FTRumReactNavigationTracking;
  });
  afterEach(() => jest.restoreAllMocks());
  const state = (route: object) => ({
    data: { state: { routes: [route], index: 0 } },
  });

  it('uses Automatic and does not send a second background stop or replay loading on resume', () => {
    const ref = {
      getCurrentRoute: () => home,
      addListener: jest.fn(),
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

describe('automatic View lifecycle coordinator', () => {
  let tracker: any;
  let change: (state: string) => void;
  let monotonic = 100;
  const home = { key: 'home', name: 'Home' };
  const detail = { key: 'detail', name: 'Detail' };
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
    tracker = new (require('../rum/FTRumViewTracking').FTRumViewTracking)();
  });
  afterEach(() => jest.restoreAllMocks());

  it('filters old and repeated disappear callbacks without closing the next route', () => {
    const first = tracker.show(home);
    const next = tracker.show(detail);
    tracker.hide(home.key, first);
    expect(mockRUM.stopView).not.toHaveBeenCalled();
    tracker.hide(detail.key, next);
    tracker.hide(detail.key, next);
    expect(mockRUM.stopView).toHaveBeenCalledTimes(1);
  });

  it('filters a late disappear for the same route after foreground recovery', () => {
    const old = tracker.show(home);
    change('inactive');
    tracker.hide(home.key, old);
    change('background');
    change('active');
    tracker.hide(home.key, old);
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(2);
    expect(mockRUM.stopView).not.toHaveBeenCalled();
  });

  it('does not restart on inactive -> active without background', () => {
    tracker.show(home);
    change('inactive');
    change('active');
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(1);
  });

  it('recovers the current route once when navigation and foreground callbacks interleave', () => {
    tracker.show(home);
    change('background');
    tracker.show(detail);
    change('active');
    tracker.show(detail);
    change('active');
    expect(mockNativeRUM.startViewWithTrackingType.mock.calls).toEqual([
      ['Home', { context: 'global' }, 1],
      ['Detail', { context: 'global' }, 1],
    ]);
    expect(mockNativeRUM.onCreateViewWithLoadStart).not.toHaveBeenCalled();
  });

  it('records one actual loading start even with duplicate begin events', () => {
    tracker.beginLoad(home.key);
    monotonic = 110;
    tracker.beginLoad(home.key);
    monotonic = 125.5;
    tracker.show(home);
    expect(mockNativeRUM.onCreateViewWithLoadStart).toHaveBeenCalledWith(
      'Home',
      25500000,
      1700000000000
    );
    tracker.show(detail);
    tracker.show(home);
    expect(mockNativeRUM.onCreateViewWithLoadStart).toHaveBeenCalledTimes(1);
  });

  it.each([0, 900100])(
    'drops invalid or expired monotonic loading at %s ms',
    (end) => {
      tracker.beginLoad(home.key);
      monotonic = end;
      tracker.show(home);
      expect(mockNativeRUM.onCreateViewWithLoadStart).not.toHaveBeenCalled();
      expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledWith(
        'Home',
        { context: 'global' },
        1
      );
    }
  );

  it('does not reuse loading from an abandoned transition', () => {
    tracker.beginLoad(home.key);
    monotonic = 120;
    tracker.beginLoad(detail.key);
    monotonic = 140;
    tracker.beginLoad(home.key);
    monotonic = 150;
    tracker.show(home);
    expect(mockNativeRUM.onCreateViewWithLoadStart).toHaveBeenCalledWith(
      'Home',
      10000000,
      1700000000000
    );
  });

  it('normalizes invalid epochs internally before legacy bridge serialization', () => {
    (Date.now as jest.Mock).mockReturnValue(NaN);
    tracker.beginLoad(home.key);
    monotonic = 125.5;
    tracker.show(home);
    expect(mockNativeRUM.onCreateViewWithLoadStart).toHaveBeenCalledWith(
      'Home',
      25500000,
      0
    );
    expect(mockRUM.onCreateView).not.toHaveBeenCalled();
    expect(mockRUM.startView).not.toHaveBeenCalled();
  });

  it('does not invent a loading start when it was not observed', () => {
    tracker.show(home);
    expect(mockNativeRUM.onCreateViewWithLoadStart).not.toHaveBeenCalled();
  });

  it('does not defer a stale start behind an unresolved native completion', async () => {
    let finish!: () => void;
    mockNativeRUM.onCreateViewWithLoadStart.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        })
    );
    tracker.beginLoad(home.key);
    monotonic = 150;
    tracker.show(home);
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(1);
    change('background');
    tracker.show(detail);
    change('active');
    finish();
    await Promise.resolve();
    expect(mockNativeRUM.startViewWithTrackingType.mock.calls).toEqual([
      ['Home', { context: 'global' }, 1],
      ['Detail', { context: 'global' }, 1],
    ]);
    expect(mockRUM.stopView).not.toHaveBeenCalled();
  });

  it('removes subscriptions and invalidates old generations after stopping', () => {
    const old = tracker.show(home);
    const remove = mockAppState.addEventListener.mock.results[0].value.remove;
    tracker.stop();
    expect(remove).toHaveBeenCalledTimes(1);
    tracker.show(home);
    mockRUM.stopView.mockClear();
    tracker.hide(home.key, old);
    expect(mockRUM.stopView).not.toHaveBeenCalled();
  });

  it('ignores queued AppState callbacks from a disposed subscription', () => {
    tracker.show(home);
    const oldChange = change;
    tracker.stop();
    tracker.show(home);
    oldChange('background');
    oldChange('active');
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(2);
  });

  it('supports legacy AppState listener removal without registering duplicates', () => {
    mockAppState.addEventListener.mockReturnValueOnce(undefined);
    tracker.start();
    tracker.start();
    tracker.stop();
    expect(mockAppState.addEventListener).toHaveBeenCalledTimes(1);
    expect(mockAppState.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });

  it('defers starting while initially backgrounded and does not collect background loading', () => {
    mockAppState.currentState = 'background';
    tracker.beginLoad(home.key);
    tracker.show(home);
    expect(mockNativeRUM.startViewWithTrackingType).not.toHaveBeenCalled();
    change('active');
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(1);
    expect(mockNativeRUM.onCreateViewWithLoadStart).not.toHaveBeenCalled();
  });
});

describe('React Native Navigation adapter', () => {
  let adapter: any;
  let change: (state: string) => void;
  let callbacks: Record<string, any>;
  let removes: jest.Mock[];
  let react: { createElement: any };
  let original: jest.Mock;
  let monotonic = 10;
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockAppState.currentState = 'active';
    callbacks = {};
    removes = [];
    original = jest.fn();
    react = { createElement: original };
    mockAppState.addEventListener.mockImplementation((_name, listener) => {
      change = listener;
      return { remove: jest.fn() };
    });
    jest.spyOn(Date, 'now').mockReturnValue(1700000000001);
    jest.spyOn(performance, 'now').mockImplementation(() => monotonic);
    monotonic = 10;
    const paths = [require.resolve('../../../../example/package.json')];
    jest.doMock(require.resolve('react', { paths }), () => ({
      __esModule: true,
      default: react,
    }));
    jest.doMock(require.resolve('react-native-navigation', { paths }), () => ({
      Navigation: {
        events: () => ({
          registerComponentListener: (listener: any, key: string) => {
            callbacks[key] = listener;
            const remove = jest.fn();
            removes.push(remove);
            return { remove };
          },
        }),
      },
    }));
    jest.doMock(
      require.resolve('@cloudcare/react-native-mobile', { paths }),
      () => ({
        get FTRumViewTracking() {
          return require('../rum/FTRumViewTracking').FTRumViewTracking;
        },
      })
    );
    adapter =
      require('../../../../example/src/FTRumReactNativeNavigationTracking').FTRumReactNativeNavigationTracking;
    adapter.startTracking();
    react.createElement('screen', { componentId: 'home' });
  });
  afterEach(() => {
    adapter.stopTracking();
    jest.restoreAllMocks();
  });

  it('uses exact monotonic duration and protects a foreground View from an old disappearance', () => {
    callbacks.home.componentWillAppear({ componentName: 'Home' });
    monotonic = 35.5;
    callbacks.home.componentDidAppear({ componentName: 'Home' });
    expect(mockNativeRUM.onCreateViewWithLoadStart).toHaveBeenCalledWith(
      'Home',
      25500000,
      1700000000001
    );
    change('background');
    callbacks.home.componentDidDisappear();
    change('active');
    callbacks.home.componentDidDisappear();
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(2);
    expect(mockNativeRUM.onCreateViewWithLoadStart).toHaveBeenCalledTimes(1);
    expect(mockRUM.stopView).not.toHaveBeenCalled();
  });

  it('ignores a late appearance after a newer transition has started', () => {
    callbacks.home.componentWillAppear({ componentName: 'Home' });
    react.createElement('screen', { componentId: 'detail' });
    callbacks.detail.componentWillAppear({ componentName: 'Detail' });
    callbacks.detail.componentDidAppear({ componentName: 'Detail' });
    callbacks.home.componentDidAppear({ componentName: 'Home' });
    expect(mockNativeRUM.startViewWithTrackingType.mock.calls).toEqual([
      ['Detail', { context: 'global' }, 1],
    ]);
  });

  it('ignores old-route disappearance and unregisters component listeners on disposal', () => {
    callbacks.home.componentDidAppear({ componentName: 'Home' });
    react.createElement('screen', { componentId: 'detail' });
    callbacks.detail.componentDidAppear({ componentName: 'Detail' });
    callbacks.home.componentDidDisappear();
    expect(mockRUM.stopView).not.toHaveBeenCalled();
    callbacks.detail.componentDidDisappear();
    callbacks.detail.componentDidDisappear();
    expect(mockRUM.stopView).toHaveBeenCalledTimes(1);
    adapter.stopTracking();
    removes.forEach((remove) => expect(remove).toHaveBeenCalledTimes(1));
    expect(react.createElement).toBe(original);
  });
});
