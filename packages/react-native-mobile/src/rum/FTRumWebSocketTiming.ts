/** Measures only the JS-observed opening handshake; bridge delays are excluded. */
export function startWebSocketTiming(): () => number | undefined {
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
    return Number.isSafeInteger(durationNs) ? durationNs : undefined;
  };
}

function readWallTime(): number | undefined {
  try {
    const time = Date.now();
    return Number.isFinite(time) ? time : undefined;
  } catch {
    return undefined;
  }
}
