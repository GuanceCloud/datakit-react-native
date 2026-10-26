/** Anonymous Visitor ID header configuration for HTTP(S), excluding WebSockets. */
export interface FTVisitorIdConfig {
  header: string;
  /** Fixed lifetime in hours; defaults to 24. Access does not renew it. */
  ttlHours?: number;
  /** Complete HTTP(S) prefixes constrained to the same scheme, host and port. */
  urlPrefixes?: string[];
  /** Native regular expressions searched against the complete URL; rules use OR. */
  regularExpressions?: string[];
}

// These restrictions are shared by the target iOS and Android native SDKs.
const reservedHeaders = new Set([
  'accept-charset',
  'accept-encoding',
  'access-control-request-headers',
  'access-control-request-method',
  'connection',
  'content-length',
  'cookie',
  'cookie2',
  'date',
  'dnt',
  'expect',
  'host',
  'keep-alive',
  'origin',
  'permissions-policy',
  'referer',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'via',
  'b3',
  'traceparent',
  'tracestate',
  'uber-trace-id',
  'sw8',
  'x-gc-trace-id',
  'x-gc-span-id',
  'x-rum-resource-id',
]);
const reservedFragments = [
  'authorization',
  'authentication',
  'api-key',
  'api_key',
  'apikey',
  'auth-token',
  'auth_token',
  'access-token',
  'access_token',
  'session-token',
  'session_token',
  'refresh-token',
  'refresh_token',
  'id-token',
  'id_token',
  'security-token',
  'security_token',
  'csrf',
  'xsrf',
  'jwt',
  'signature',
];

export function validateVisitorIdConfig(config: FTVisitorIdConfig): void {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('visitorIdConfig must be an object');
  }
  const {
    header,
    ttlHours = 24,
    urlPrefixes = [],
    regularExpressions = [],
  } = config;
  if (
    typeof header !== 'string' ||
    /[\r\n]/.test(header) ||
    !/^[!#$%&'*+.^_`|~0-9a-z-]+$/.test(header) ||
    reservedHeaders.has(header) ||
    reservedFragments.some((part) => header.includes(part)) ||
    ['proxy-', 'sec-', 'x-datadog-', 'x-b3-'].some((prefix) =>
      header.startsWith(prefix)
    )
  ) {
    throw new Error(
      'visitorIdConfig.header must be a lowercase custom HTTP header'
    );
  }
  // Android stores TTL as a signed long number of milliseconds.
  const milliseconds = ttlHours * 3600000;
  if (
    typeof ttlHours !== 'number' ||
    !Number.isFinite(ttlHours) ||
    milliseconds < 1 ||
    milliseconds >= 2 ** 63
  ) {
    throw new Error(
      'visitorIdConfig.ttlHours must represent at least 1 millisecond and fit a signed 64-bit integer'
    );
  }
  if (
    !Array.isArray(urlPrefixes) ||
    !Array.isArray(regularExpressions) ||
    urlPrefixes.length + regularExpressions.length === 0
  ) {
    throw new Error('visitorIdConfig requires at least one URL matching rule');
  }
  if (
    urlPrefixes.some(
      (prefix) =>
        typeof prefix !== 'string' ||
        !/^https?:\/\/[^/?#\s]+(?:[/?#]|$)/i.test(prefix)
    ) ||
    regularExpressions.some(
      (pattern) => typeof pattern !== 'string' || pattern.length === 0
    )
  ) {
    throw new Error('visitorIdConfig contains an invalid URL matching rule');
  }
}
