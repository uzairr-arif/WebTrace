/**
 * SensitiveDataRedactor — the ingestion-time privacy gate.
 *
 * Nothing reaches storage or the UI without passing through here. Request and
 * response bodies are never captured at all; sensitive header values and
 * credential-looking query parameters are masked before anything is persisted.
 *
 * This module is deliberately dependency-free and aggressively unit-tested.
 */

import type { HttpHeader } from './header';

export const REDACTED = '••••••••';

/** Header names whose VALUES must never be stored or shown. */
const SENSITIVE_HEADERS = new Set<string>([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-apikey',
  'x-auth-token',
  'x-access-token',
  'x-csrf-token',
  'x-xsrf-token',
  'x-amz-security-token',
  'x-goog-api-key',
  'azure-key-token',
  'private-token',
]);

/** Query parameter names that look credential-ish. */
const SENSITIVE_PARAM =
  /^(token|access[-_]?token|refresh[-_]?token|id[-_]?token|api[-_]?key|apikey|app[-_]?key|client[-_]?secret|auth|authorization|password|passwd|pwd|secret|session[-_]?id|sessionid|sid|jwt|sig|signature|otp|private[-_]?key)$/i;

export function isSensitiveHeader(name: string): boolean {
  return SENSITIVE_HEADERS.has(name.toLowerCase().trim());
}

function maskParamValue(value: string): string {
  return value.length > 0 ? REDACTED : value;
}

/**
 * Redact a header list (browser shape) or a plain record into a safe
 * name → value map. Header NAMES are always preserved — they carry the
 * teaching value ("Authorization exists here"); values are masked.
 */
export function redactHeaders(
  headers: HttpHeader[] | Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!headers) return undefined;
  const out: Record<string, string> = {};
  if (Array.isArray(headers)) {
    for (const h of headers) {
      if (!h || typeof h.name !== 'string') continue;
      out[h.name] = isSensitiveHeader(h.name) ? REDACTED : (h.value ?? '');
    }
  } else {
    for (const [name, value] of Object.entries(headers)) {
      out[name] = isSensitiveHeader(name) ? REDACTED : value;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/** Redact credential-looking query parameters, preserving the key names. */
export function redactUrl(url: string | undefined): string {
  if (!url) return '';
  const qIndex = url.indexOf('?');
  if (qIndex === -1) return url;
  const base = url.slice(0, qIndex);
  const query = url.slice(qIndex + 1);
  if (query === '') return url;

  const pairs = query.split('&').map((pair) => {
    const eq = pair.indexOf('=');
    if (eq === -1) return SENSITIVE_PARAM.test(pair) ? `${pair}=${REDACTED}` : pair;
    const key = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    return SENSITIVE_PARAM.test(key) ? `${key}=${maskParamValue(value)}` : pair;
  });
  return `${base}?${pairs.join('&')}`;
}
