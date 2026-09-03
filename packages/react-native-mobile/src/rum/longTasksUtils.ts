export const MIN_LONG_TASK_THRESHOLD_MS = 100;
export const MAX_LONG_TASK_THRESHOLD_MS = 5000;
export const DEFAULT_LONG_TASK_THRESHOLD_MS = 100;

/**
 * Converts the public JavaScript long task option to the numeric value expected
 * by the native bridge. Enablement is controlled separately.
 */
export function normalizeLongTaskThreshold(threshold?: number): number {
  if (!threshold) {
    return DEFAULT_LONG_TASK_THRESHOLD_MS;
  }
  if (threshold < MIN_LONG_TASK_THRESHOLD_MS) {
    return MIN_LONG_TASK_THRESHOLD_MS;
  }
  return Math.min(threshold, MAX_LONG_TASK_THRESHOLD_MS);
}
