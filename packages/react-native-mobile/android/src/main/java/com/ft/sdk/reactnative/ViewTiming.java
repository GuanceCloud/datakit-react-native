package com.ft.sdk.reactnative;

final class ViewTiming {
  private ViewTiming() {}

  static long durationNanoseconds(double value) {
    return (!Double.isNaN(value) && !Double.isInfinite(value)) && value > 0 && value < 0x1p63 ? (long) value : 0;
  }

  static long epochNanoseconds(double milliseconds) {
    if ((Double.isNaN(milliseconds) || Double.isInfinite(milliseconds)) || milliseconds <= 0 || milliseconds >= 0x1p63 / 1000000.0) return 0;
    long whole = (long) milliseconds;
    long fraction = (long) ((milliseconds - whole) * 1000000.0);
    if (whole > Long.MAX_VALUE / 1000000 || fraction > Long.MAX_VALUE - whole * 1000000) return 0;
    return whole * 1000000 + fraction;
  }
}
