/**
 * Host/URL helpers. Third-party classification uses an approximated
 * registrable domain (last two labels, plus a small list of common two-part
 * public suffixes). It is deliberately honest about being an approximation —
 * a full Public Suffix List is a future upgrade.
 */

const MULTIPART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'gov.uk', 'ac.uk', 'me.uk',
  'com.au', 'net.au', 'org.au',
  'com.br', 'com.mx', 'com.ar', 'com.tr',
  'co.jp', 'ne.jp', 'or.jp',
  'co.in', 'co.nz', 'co.za', 'co.kr',
  'com.cn', 'com.tw', 'com.hk', 'com.sg', 'com.pk',
]);

export function hostOf(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** Approximate the registrable domain ("site") a host belongs to. */
export function registrableDomain(host: string): string {
  if (!host) return '';
  const labels = host.split('.').filter(Boolean);
  if (labels.length <= 2) return labels.join('.');
  const lastTwo = labels.slice(-2).join('.');
  const lastThree = labels.slice(-3).join('.');
  if (MULTIPART_SUFFIXES.has(lastTwo) && labels.length >= 3) return lastThree;
  return lastTwo;
}

/** True when both hosts belong to the same approximate registrable domain. */
export function sameSite(hostA: string, hostB: string): boolean {
  if (!hostA || !hostB) return true;
  return registrableDomain(hostA) === registrableDomain(hostB);
}

export function pathOf(url: string | undefined): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    const q = u.search.length > 0 ? u.search : '';
    return (u.pathname === '' ? '/' : u.pathname) + q;
  } catch {
    return url;
  }
}

/** Compact display form: host + path, truncated with an ellipsis. */
export function shortUrl(url: string | undefined, max = 60): string {
  if (!url) return '';
  let host = '';
  let rest = '';
  try {
    const u = new URL(url);
    host = u.host;
    rest = u.pathname + u.search;
  } catch {
    host = url.split('/')[0] ?? url;
    rest = url.slice(host.length);
  }
  if (rest === '' || rest === '/') rest = '/';
  let out = host + rest;
  if (out.length > max) out = out.slice(0, Math.max(1, max - 1)) + '…';
  return out;
}
