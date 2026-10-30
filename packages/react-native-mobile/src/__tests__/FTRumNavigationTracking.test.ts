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
    tracker = new (jest.requireActual(
      '../rum/FTRumViewTracking'
    ).FTRumViewTracking)();
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

  it('updates only the current active appearance without awaiting start completion', () => {
    const first = tracker.show(home);
    tracker.updateLoadingTime(home.key, first, 500000000);
    const next = tracker.show(detail);
    tracker.updateLoadingTime(home.key, first, 100000000);
    change('background');
    tracker.updateLoadingTime(detail.key, next, 200000000);
    change('active');
    tracker.updateLoadingTime(detail.key, next, 300000000);
    const resumed = tracker.show(detail);
    tracker.updateLoadingTime(detail.key, resumed, 250000000);
    expect(mockRUM.updateViewLoadingTime.mock.calls).toEqual([
      [500000000],
      [250000000],
    ]);
  });
});
