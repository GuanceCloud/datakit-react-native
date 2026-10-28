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
    expect(stop()).toEqual({
      duration: 25_125_000,
      fetchStartNsTimeInterval: '1000000000',
      fetchEndNsTimeInterval: '1025125000',
    });
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
      expect(stop()).toEqual({
        duration: 25_000_000,
        fetchStartNsTimeInterval: '1000000000',
        fetchEndNsTimeInterval: '1025000000',
      });
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
    jest.spyOn(Date, 'now').mockReturnValue(1700000000001);
    expect(startWebSocketTiming()()).toEqual({
      duration: 0,
      fetchStartNsTimeInterval: '1700000000001000000',
      fetchEndNsTimeInterval: '1700000000001000000',
    });
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

  it('keeps nanosecond precision when the interval crosses a millisecond boundary', () => {
    let now = 10;
    setPerformanceClock(() => now);
    jest.spyOn(Date, 'now').mockReturnValue(1700000000999);
    const stop = startWebSocketTiming();
    now = 11.000001;
    expect(stop()).toEqual({
      duration: 1000001,
      fetchStartNsTimeInterval: '1700000000999000000',
      fetchEndNsTimeInterval: '1700000001000000001',
    });
  });

  it.each([0, -1, NaN, Infinity, 1.5, 9223372036855])(
    'omits the interval instead of inventing an epoch when start time is %s',
    (epoch) => {
      let now = 10;
      setPerformanceClock(() => now);
      jest.spyOn(Date, 'now').mockReturnValue(epoch);
      const stop = startWebSocketTiming();
      now = 35;
      expect(stop()).toEqual({ duration: 25000000 });
    }
  );

  it('omits an interval whose end exceeds int64 even when the start fits', () => {
    let now = 0;
    setPerformanceClock(() => now);
    jest.spyOn(Date, 'now').mockReturnValue(9223372036854);
    const stop = startWebSocketTiming();
    now = 1;
    expect(stop()).toEqual({ duration: 1000000 });
  });

  it('keeps a monotonic duration when the wall clock throws', () => {
    let now = 10;
    setPerformanceClock(() => now);
    jest.spyOn(Date, 'now').mockImplementation(() => {
      throw new Error('wall clock unavailable');
    });
    const stop = startWebSocketTiming();
    now = 35;
    expect(stop()).toEqual({ duration: 25000000 });
  });
});
