export interface WebSocketTimingMetrics {
  duration: number;
  // Decimal int64 nanoseconds: epoch nanoseconds exceed JS number precision.
  fetchStartNsTimeInterval?: string;
  fetchEndNsTimeInterval?: string;
}

/** Measures only the JS-observed opening handshake; bridge delays are excluded. */
export function startWebSocketTiming(): () =>
  | WebSocketTimingMetrics
  | undefined {
  const wallStart = readWallTime();
  let monotonicNow: (() => number) | undefined;
  let monotonicStart: number | undefined;
  try {
    const clock = globalThis.performance;
    if (typeof clock?.now === 'function') {
      monotonicNow = () => clock.now();
      monotonicStart = monotonicNow();
    }
  } catch {
    // Older runtimes and other instrumentation may not provide this clock.
  }

  return () => {
    let durationMs: number | undefined;
    try {
      if (monotonicNow && Number.isFinite(monotonicStart)) {
        const elapsed = monotonicNow() - (monotonicStart as number);
        if (Number.isFinite(elapsed) && elapsed >= 0) {
          durationMs = elapsed;
        }
      }
    } catch {
      // Fall back to wall time if the monotonic clock becomes unavailable.
    }
    if (durationMs === undefined && wallStart !== undefined) {
      const wallEnd = readWallTime();
      if (wallEnd !== undefined && wallEnd >= wallStart) {
        durationMs = wallEnd - wallStart;
      }
    }
    if (durationMs === undefined) {
      return undefined;
    }
    // Resource metrics use nanoseconds. Do not send an invalid bridge number.
    const durationNs = Math.round(durationMs * 1e6);
    if (!Number.isSafeInteger(durationNs)) return undefined;
    const metrics: WebSocketTimingMetrics = { duration: durationNs };
    if (
      wallStart !== undefined &&
      Number.isSafeInteger(wallStart) &&
      wallStart > 0
    ) {
      // Add the monotonic elapsed interval to the start epoch, not Date.now()
      // at completion. Split milliseconds/remainder to avoid epoch-ns doubles.
      const endMs = wallStart + Math.floor(durationNs / 1e6);
      const start = `${wallStart}000000`;
      const end = `${endMs}${String(durationNs % 1e6).padStart(6, '0')}`;
      if (Number.isSafeInteger(endMs) && fitsInt64(start) && fitsInt64(end)) {
        metrics.fetchStartNsTimeInterval = start;
        metrics.fetchEndNsTimeInterval = end;
      }
    }
    return metrics;
  };
}

function fitsInt64(value: string): boolean {
  return (
    value.length < 19 || (value.length === 19 && value <= '9223372036854775807')
  );
}

function readWallTime(): number | undefined {
  try {
    const time = Date.now();
    return Number.isFinite(time) ? time : undefined;
  } catch {
    return undefined;
  }
}
