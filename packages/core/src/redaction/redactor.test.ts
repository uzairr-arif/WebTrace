import { describe, expect, it } from 'vitest';
import { REDACTED, isSensitiveHeader, redactHeaders, redactUrl } from './redactor';

describe('SensitiveDataRedactor', () => {
  it('masks sensitive header values but keeps names', () => {
    const out = redactHeaders([
      { name: 'Authorization', value: 'Bearer abc.def.ghi' },
      { name: 'Cookie', value: 'session=secret123' },
      { name: 'Accept', value: 'application/json' },
      { name: 'set-cookie', value: 'a=1; HttpOnly' },
    ]);
    expect(out).toEqual({
      Authorization: REDACTED,
      Cookie: REDACTED,
      Accept: 'application/json',
      'set-cookie': REDACTED,
    });
  });

  it('handles record-shaped headers', () => {
    const out = redactHeaders({
      'X-API-Key': 'sk_live_123',
      'Content-Type': 'text/html',
    });
    expect(out?.['X-API-Key']).toBe(REDACTED);
    expect(out?.['Content-Type']).toBe('text/html');
  });

  it('detects sensitive header names case-insensitively', () => {
    expect(isSensitiveHeader('authorization')).toBe(true);
    expect(isSensitiveHeader('SET-COOKIE')).toBe(true);
    expect(isSensitiveHeader('x-custom-id')).toBe(false);
  });

  it('redacts credential-looking query parameters, keeps others', () => {
    const out = redactUrl('https://example.com/cb?code=abc&access_token=xyz123&state=ok');
    expect(out).toBe(
      `https://example.com/cb?code=abc&access_token=${REDACTED}&state=ok`,
    );
  });

  it('leaves urls without query strings untouched', () => {
    expect(redactUrl('https://example.com/api/products')).toBe(
      'https://example.com/api/products',
    );
  });

  it('redacts empty and normal urls safely', () => {
    expect(redactUrl(undefined)).toBe('');
    expect(redactUrl('')).toBe('');
    expect(redactUrl('not-a-url?password=hunter2')).toBe(`not-a-url?password=${REDACTED}`);
  });
});
