#import <Foundation/Foundation.h>
#include <math.h>
#include <stdint.h>

// Use an exclusive 2^63 bound: double cannot represent INT64_MAX exactly.
static inline NSNumber *FTViewDurationNanoseconds(double value) {
  return isfinite(value) && value > 0 && value < 0x1p63 ? @((int64_t)value) : @0;
}

static inline NSNumber *FTViewEpochNanoseconds(double milliseconds) {
  if (!isfinite(milliseconds) || milliseconds <= 0 || milliseconds >= 0x1p63 / 1000000.0) return nil;
  // Split before multiplication so integer millisecond epochs stay exact.
  int64_t whole = (int64_t)milliseconds;
  int64_t fraction = (int64_t)((milliseconds - whole) * 1000000.0);
  if (whole > INT64_MAX / 1000000 || fraction > INT64_MAX - whole * 1000000) return nil;
  int64_t nanoseconds = whole * 1000000 + fraction;
  return nanoseconds > 0 ? @(nanoseconds) : nil;
}
