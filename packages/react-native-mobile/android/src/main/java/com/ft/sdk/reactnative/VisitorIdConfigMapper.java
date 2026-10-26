package com.ft.sdk.reactnative;

import com.ft.sdk.FTVisitorIdConfig;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

final class VisitorIdConfigMapper {
  private VisitorIdConfigMapper() {}

  static FTVisitorIdConfig fromMap(Object value) {
    if (value == null) return null;
    if (!(value instanceof Map)) throw new IllegalArgumentException("visitorIdConfig must be an object");
    Map<?, ?> map = (Map<?, ?>) value;
    if (!(map.get("header") instanceof String)) throw new IllegalArgumentException("Visitor ID header is required");
    FTVisitorIdConfig config = new FTVisitorIdConfig().setHeader((String) map.get("header"));
    if (map.containsKey("ttlHours")) {
      if (!(map.get("ttlHours") instanceof Number)) throw new IllegalArgumentException("Visitor ID TTL must be numeric");
      double hours = ((Number) map.get("ttlHours")).doubleValue();
      double milliseconds = hours * 3600000;
      if (Double.isNaN(hours) || Double.isInfinite(hours) || milliseconds < 1 || milliseconds >= Long.MAX_VALUE) {
        throw new IllegalArgumentException("Visitor ID TTL is out of range");
      }
      config.setTtlHours(hours);
    }
    int rules = 0;
    for (String key : new String[]{"urlPrefixes", "regularExpressions"}) {
      Object values = map.get(key);
      if (values == null && !map.containsKey(key)) continue;
      if (!(values instanceof List)) throw new IllegalArgumentException(key + " must be an array");
      for (Object item : (List<?>) values) {
        if (!(item instanceof String) || ((String) item).isEmpty()) throw new IllegalArgumentException("Invalid Visitor ID rule");
        String rule = (String) item;
        if ("urlPrefixes".equals(key)) {
          URI uri = URI.create(rule);
          if (uri.getHost() == null || !("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))) {
            throw new IllegalArgumentException("Visitor ID prefix must be an HTTP(S) URL");
          }
          config.addMatch(rule);
        } else {
          config.addMatch(Pattern.compile(rule));
        }
        rules++;
      }
    }
    if (rules == 0) throw new IllegalArgumentException("Visitor ID requires URL matching rules");
    return config;
  }
}
