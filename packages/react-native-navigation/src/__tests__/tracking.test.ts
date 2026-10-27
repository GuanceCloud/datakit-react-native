const mockNativeRUM = {
  onCreateViewWithLoadStart: jest.fn().mockResolvedValue(undefined),
  startViewWithTrackingType: jest.fn().mockResolvedValue(undefined),
};
const mockRUM = { stopView: jest.fn().mockResolvedValue(undefined) };
const mockAppState = {
  currentState: 'active',
  addEventListener: jest.fn(),
};
const mockEvents = {
  registerComponentWillAppearListener: jest.fn(),
  registerComponentDidAppearListener: jest.fn(),
  registerComponentDidDisappearListener: jest.fn(),
};
jest.mock('react-native-navigation', () => ({
  Navigation: { events: () => mockEvents },
}));
jest.mock('react-native', () => ({ AppState: mockAppState }));
jest.mock(
  '../../../react-native-mobile/src/specs/NativeFTReactNativeRUM',
  () => ({
    default: mockNativeRUM,
  })
);
jest.mock('../../../react-native-mobile/src/ft_rum', () => ({
  FTReactNativeRUM: mockRUM,
}));
jest.mock('../../../react-native-mobile/src/ft_mobile_agent', () => ({
  bridgeContextManager: {
    mergeWithLocalPropertiesSync: () => ({ context: 'global' }),
  },
}));
jest.mock(
  '@cloudcare/react-native-mobile',
  () => ({
    get FTRumViewTracking() {
      return jest.requireActual(
        '../../../react-native-mobile/src/rum/FTRumViewTracking'
      ).FTRumViewTracking;
    },
  }),
  { virtual: true }
);

type Event = {
  componentId: string;
  componentName: string;
  componentType: string;
};
const home: Event = {
  componentId: 'home',
  componentName: 'Home',
  componentType: 'Component',
};
const detail: Event = {
  componentId: 'detail',
  componentName: 'Detail',
  componentType: 'Component',
};

describe('React Native Navigation plugin', () => {
  let adapter: typeof import('../index').FTRumReactNativeNavigationTracking;
  let change: (state: string) => void;
  let will: (event: Event) => void;
  let did: (event: Event) => void;
  let disappear: (event: Event) => void;
  let monotonic = 10;
  let removes: jest.Mock[];
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockAppState.currentState = 'active';
    removes = [];
    for (const [method, assign] of [
      [
        mockEvents.registerComponentWillAppearListener,
        (fn: typeof will) => {
          will = fn;
        },
      ],
      [
        mockEvents.registerComponentDidAppearListener,
        (fn: typeof did) => {
          did = fn;
        },
      ],
      [
        mockEvents.registerComponentDidDisappearListener,
        (fn: typeof disappear) => {
          disappear = fn;
        },
      ],
    ] as const) {
      method.mockImplementation((callback) => {
        assign(callback);
        const remove = jest.fn();
        removes.push(remove);
        return { remove };
      });
    }
    mockAppState.addEventListener.mockImplementation((_name, listener) => {
      change = listener;
      return { remove: jest.fn() };
    });
    jest.spyOn(Date, 'now').mockReturnValue(1700000000001);
    jest.spyOn(performance, 'now').mockImplementation(() => monotonic);
    monotonic = 10;
    adapter = jest.requireActual('../index').FTRumReactNativeNavigationTracking;
    adapter.startTracking();
  });
  afterEach(() => {
    adapter.stopTracking();
    jest.restoreAllMocks();
  });

  it('uses global events without rendering a React element and measures exact nanoseconds', () => {
    will(home);
    monotonic = 35.5;
    did(home);
    expect(mockNativeRUM.onCreateViewWithLoadStart).toHaveBeenCalledWith(
      'Home',
      25500000,
      1700000000001
    );
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledWith(
      'Home',
      { context: 'global' },
      1
    );
  });

  it('tracks Views when the navigation library has no will-appear registration API', () => {
    adapter.stopTracking();
    jest.clearAllMocks();
    removes = [];
    const method = Object.getOwnPropertyDescriptor(
      mockEvents,
      'registerComponentWillAppearListener'
    )!;
    Object.defineProperty(mockEvents, 'registerComponentWillAppearListener', {
      value: undefined,
    });
    try {
      expect(() => adapter.startTracking()).not.toThrow();
      adapter.startTracking();
      expect(
        mockEvents.registerComponentDidAppearListener
      ).toHaveBeenCalledTimes(1);
      did(home);
      did(home);
      did(detail);
      disappear(home);
      expect(mockRUM.stopView).not.toHaveBeenCalled();
      disappear(detail);
      disappear(detail);
      expect(mockNativeRUM.startViewWithTrackingType.mock.calls).toEqual([
        ['Home', { context: 'global' }, 1],
        ['Detail', { context: 'global' }, 1],
      ]);
      expect(mockNativeRUM.onCreateViewWithLoadStart).not.toHaveBeenCalled();
      expect(mockRUM.stopView).toHaveBeenCalledTimes(1);
      adapter.stopTracking();
      expect(removes).toHaveLength(2);
      removes.forEach((remove) => expect(remove).toHaveBeenCalledTimes(1));
    } finally {
      Object.defineProperty(
        mockEvents,
        'registerComponentWillAppearListener',
        method
      );
    }
  });

  it('protects a foreground View from an old disappearance and does not replay loading', () => {
    will(home);
    monotonic = 35.5;
    did(home);
    change('background');
    change('active');
    disappear(home);
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(2);
    expect(mockNativeRUM.onCreateViewWithLoadStart).toHaveBeenCalledTimes(1);
    expect(mockRUM.stopView).not.toHaveBeenCalled();
  });

  it('ignores a late appearance after a newer transition has started', () => {
    will(home);
    monotonic = 20;
    will(detail);
    monotonic = 45.5;
    did(detail);
    did(home);
    expect(mockNativeRUM.startViewWithTrackingType.mock.calls).toEqual([
      ['Detail', { context: 'global' }, 1],
    ]);
    expect(mockNativeRUM.onCreateViewWithLoadStart).toHaveBeenCalledWith(
      'Detail',
      25500000,
      1700000000001
    );
  });

  it('ignores callbacks queued before disposal, including after restarting', () => {
    const oldWill = will;
    const oldDid = did;
    const oldDisappear = disappear;
    adapter.stopTracking();
    adapter.startTracking();
    oldWill(home);
    oldDid(home);
    expect(mockNativeRUM.startViewWithTrackingType).not.toHaveBeenCalled();
    did(detail);
    oldDisappear(detail);
    expect(mockRUM.stopView).not.toHaveBeenCalled();
  });

  it('registers once, removes all subscriptions once and can restart', () => {
    adapter.startTracking();
    expect(mockEvents.registerComponentDidAppearListener).toHaveBeenCalledTimes(
      1
    );
    did(home);
    adapter.stopTracking();
    adapter.stopTracking();
    removes.forEach((remove) => expect(remove).toHaveBeenCalledTimes(1));
    expect(mockRUM.stopView).toHaveBeenCalledTimes(1);
    adapter.startTracking();
    did(home);
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(2);
  });

  it('ignores old-route and repeated disappearances', () => {
    did(home);
    did(detail);
    disappear(home);
    expect(mockRUM.stopView).not.toHaveBeenCalled();
    disappear(detail);
    disappear(detail);
    expect(mockRUM.stopView).toHaveBeenCalledTimes(1);
  });

  it('tracks missing will-appear without inventing loading and filters native chrome', () => {
    for (const componentType of [
      'TopBarTitle',
      'TopBarBackground',
      'TopBarButton',
    ]) {
      will({ ...home, componentType });
      did({ ...home, componentType });
      disappear({ ...home, componentType });
    }
    expect(mockNativeRUM.startViewWithTrackingType).not.toHaveBeenCalled();
    did(home);
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(1);
    expect(mockNativeRUM.onCreateViewWithLoadStart).not.toHaveBeenCalled();
  });

  it('keeps the original boundary on duplicate will-appear and consumes loading once', () => {
    will(home);
    monotonic = 20;
    will(home);
    monotonic = 35.5;
    did(home);
    did(home);
    expect(mockNativeRUM.onCreateViewWithLoadStart.mock.calls).toEqual([
      ['Home', 25500000, 1700000000001],
    ]);
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(1);
  });

  it('drops pending loading across background and recovers the transitioning screen', () => {
    will(home);
    change('background');
    monotonic = 500;
    did(home);
    change('active');
    did(home);
    expect(mockNativeRUM.onCreateViewWithLoadStart).not.toHaveBeenCalled();
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(1);
  });

  it('cleans up partial registration when a navigation event registration fails', () => {
    adapter.stopTracking();
    mockEvents.registerComponentDidAppearListener.mockImplementationOnce(() => {
      throw new Error('registration failed');
    });
    expect(() => adapter.startTracking()).toThrow('registration failed');
    removes.forEach((remove) => expect(remove).toHaveBeenCalledTimes(1));
    will(home);
    expect(mockNativeRUM.startViewWithTrackingType).not.toHaveBeenCalled();
    adapter.startTracking();
    did(home);
    expect(mockNativeRUM.startViewWithTrackingType).toHaveBeenCalledTimes(1);
  });
});
