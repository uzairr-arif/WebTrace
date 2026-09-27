/**
 * Learning Mode glossary — short, accurate definitions shown as tooltips.
 * Written for developers who know how to use DevTools but want to understand
 * what they are looking at.
 */

export interface GlossaryTerm {
  title: string;
  body: string;
}

export const GLOSSARY: Record<string, GlossaryTerm> = {
  navigation: {
    title: 'Navigation',
    body: 'A navigation is the browser moving from one document to another — typing a URL, clicking a link, or a scripted redirect. Everything a page loads hangs off a navigation.',
  },
  document: {
    title: 'HTML document',
    body: 'The HTML file the browser is rendering. It is usually the first request of a page load; every other resource is discovered from it (or from what it executes).',
  },
  initiator: {
    title: 'Initiator',
    body: 'What caused a request: the HTML parser, a script, a redirect, or a preflight. Plain webRequest only reveals the origin that started it — the exact script and line require advanced instrumentation.',
  },
  CORS: {
    title: 'CORS',
    body: 'Cross-Origin Resource Sharing. Browsers let any site SEND requests anywhere, but only let a page READ a response if the server explicitly allows that origin with Access-Control-Allow-* headers.',
  },
  preflight: {
    title: 'CORS preflight',
    body: 'For “non-simple” cross-origin requests (custom headers, methods like PUT/DELETE, some content types), the browser first sends an OPTIONS request asking permission. Only if the server answers correctly does the real request go out.',
  },
  redirect: {
    title: 'Redirect',
    body: 'A 3xx response telling the browser the resource lives elsewhere (Location header). 301/308 mean “moved permanently”; 302/307 mean “just for now”. The browser usually follows automatically.',
  },
  cache: {
    title: 'HTTP cache',
    body: 'The browser stores responses locally and reuses them when headers (Cache-Control, ETag, Expires) say they are still fresh — saving bandwidth and time.',
  },
  '304': {
    title: '304 Not Modified',
    body: 'The browser asked “is my cached copy still valid?” (with If-None-Match/If-Modified-Since) and the server said yes. No body travels — the cached copy is reused.',
  },
  'third-party': {
    title: 'Third-party request',
    body: 'A request to a site different from the page you are on — CDNs, analytics, fonts, ads. Useful for understanding performance and privacy exposure.',
  },
  DNS: {
    title: 'DNS',
    body: 'The Domain Name System turns a hostname like example.com into an IP address. Before any HTTPS request can start, the browser needs this answer (unless it is cached).',
  },
  TLS: {
    title: 'TLS',
    body: 'Transport Layer Security creates the encrypted channel for HTTPS. The browser and server negotiate keys and verify certificates before any HTTP message is exchanged.',
  },
  JSON: {
    title: 'JSON',
    body: 'JavaScript Object Notation — the data format most APIs return. Pages fetch JSON, then turn it into state and UI. A JSON response usually means “data for JavaScript”, not something shown directly.',
  },
  '401': {
    title: '401 Unauthorized',
    body: 'Despite the name, it means unauthenticated: the server does not know who you are (or your credentials were rejected). Pages usually react by showing a login flow.',
  },
  '403': {
    title: '403 Forbidden',
    body: 'The server knows who you are and still refuses the request — a permissions problem, not a login problem.',
  },
  '404': {
    title: '404 Not Found',
    body: 'No resource exists at this URL right now. Could be a typo, a removed route, or a deployment where the file is missing.',
  },
  '429': {
    title: '429 Too Many Requests',
    body: 'Rate limiting — the client sent too many requests in a window. Servers usually hint when to retry with the Retry-After header.',
  },
  '500': {
    title: '500 Internal Server Error',
    body: 'The server failed while handling the request. The browser did its job; the problem lives server-side.',
  },
  'blocked request': {
    title: 'Blocked request',
    body: 'The request never completed. Either the network failed, or something policy-shaped (browser, extension, ORB/CORS checks) prevented the response from being used.',
  },
  'Fetch / XHR': {
    title: 'Fetch / XHR',
    body: 'The two ways JavaScript makes HTTP requests: the modern fetch() API and the older XMLHttpRequest. Browsers report both with the same resource type.',
  },
};

export function glossaryTerm(key: string): GlossaryTerm | undefined {
  return GLOSSARY[key];
}
