import { startWebSocketTiming } from '../rum/FTRumWebSocketTiming';

describe('WebSocket handshake timing', () => {
  const performanceDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'performance'
  );
  const setPerformanceClock = (now?: () => number) => {
    Object.defineProperty(globalThis, 'performance', {
      configurable: true,
      value: now ? { now } : undefined,
    });
  };

  afterEach(() => {
    jest.restoreAllMocks();
    if (performanceDescriptor) {
      Object.defineProperty(globalThis, 'performance', performanceDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'performance');
    }
  });

  it('uses monotonic milliseconds and converts to nanoseconds despite wall-clock changes', () => {
    let now = 10;
    setPerformanceClock(() => now);
    const wallTime = jest.spyOn(Date, 'now').mockReturnValue(1000);
    const stop = startWebSocketTiming();
    now = 35.125;
    wallTime.mockReturnValue(1);
    expect(stop()).toBe(25_125_000);
  });

  it.each(['missing', 'throws', 'invalid'])(
    'falls back to wall time when the monotonic clock is %s',
    (mode) => {
      setPerformanceClock(
        mode === 'missing'
          ? undefined
          : () => {
              if (mode === 'throws') {
                throw new Error('clock unavailable');
              }
              return NaN;
            }
      );
      const wallTime = jest.spyOn(Date, 'now').mockReturnValue(1000);
      const stop = startWebSocketTiming();
      wallTime.mockReturnValue(1025);
      expect(stop()).toBe(25_000_000);
    }
  );

  it.each([999, NaN, Infinity, Number.MAX_SAFE_INTEGER])(
    'omits an invalid duration when the wall clock ends at %s',
    (end) => {
      setPerformanceClock();
      const wallTime = jest.spyOn(Date, 'now').mockReturnValue(1000);
      const stop = startWebSocketTiming();
      wallTime.mockReturnValue(end);
      expect(stop()).toBeUndefined();
    }
  );

  it('preserves a measured zero duration', () => {
    setPerformanceClock(() => 0);
    expect(startWebSocketTiming()()).toBe(0);
  });

  it('does not throw when both clocks throw', () => {
    setPerformanceClock(() => {
      throw new Error('monotonic clock unavailable');
    });
    jest.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('wall clock unavailable');
    });
    expect(startWebSocketTiming()()).toBeUndefined();
  });
});
