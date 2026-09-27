/**
 * WebTrace demo fixture — a deliberately "interesting" little site that
 * exercises everything the flow explorer visualizes:
 *
 *   - HTML document → stylesheet (with ETag revalidation → 304) → script → image
 *   - fetch() JSON calls, an XHR call
 *   - a 404 and a 500 (error stories)
 *   - a redirect chain (301 → 302 → JSON)
 *   - a cross-origin POST with a custom header → CORS preflight (OPTIONS)
 *
 * Zero dependencies: plain node:http. Two ports to create a genuine
 * cross-origin boundary for the preflight.
 *
 *   node server.mjs            (ports 4173 + 4174)
 *   PORT=8080 CROSS_PORT=8081 node server.mjs
 */

import { createServer } from 'node:http';

const PORT = Number(process.env.PORT || 46001);
const CROSS_PORT = Number(process.env.CROSS_PORT || 46002);
const CROSS_ORIGIN = `http://localhost:${CROSS_PORT}`;

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    ...headers,
  });
  res.end(body);
}

function sendJson(res, status, body, headers = {}) {
  send(res, status, JSON.stringify(body), {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
}

/* ------------------------------- main site -------------------------------- */

const HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>WebTrace fixture</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <h1>WebTrace demo fixture</h1>
  <p>This little page fires the traffic WebTrace loves to explain.</p>
  <img src="/logo.svg" width="48" alt="logo">
  <script src="/app.js"></script>
</body>
</html>`;

const CSS = `body { font-family: system-ui, sans-serif; margin: 2rem; }
h1 { color: #0a7ea4; }`;
const CSS_ETAG = '"webtrace-fixture-css-v1"';

const APP_JS = `async function run() {
  const cross = ${JSON.stringify(CROSS_ORIGIN)};
  try { await fetch('/api/products'); } catch {}
  try { await fetch('/api/user'); } catch {}
  try {
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/legacy');
      xhr.onload = resolve;
      xhr.onerror = reject;
      xhr.send();
    });
  } catch {}
  try { await fetch('/api/missing'); } catch {}
  try { await fetch('/api/server-error'); } catch {}
  try { await fetch('/redirect-1'); } catch {}
  try {
    await fetch(cross + '/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-WebTrace-Demo': '1' },
      body: JSON.stringify({ items: [1, 2, 3] }),
    });
  } catch {}
  document.title = 'WebTrace fixture loaded';
}
run();
`;

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48">
  <circle cx="5" cy="18" r="3" fill="#22d3ee"/>
  <circle cx="19" cy="14" r="3" fill="#22d3ee"/>
  <circle cx="12" cy="6" r="3.5" fill="#0ea5b7"/>
  <path d="M5 18 L12 6 L19 14" stroke="#0ea5b7" stroke-width="2" fill="none"/>
</svg>`;

const mainServer = createServer((req, res) => {
  const url = (req.url ?? '/').split('?')[0];

  switch (url) {
    case '/':
      send(res, 200, HTML, { 'Content-Type': 'text/html; charset=utf-8' });
      break;
    case '/style.css':
      if (req.headers['if-none-match'] === CSS_ETAG) {
        res.writeHead(304, { ETag: CSS_ETAG });
        res.end();
      } else {
        send(res, 200, CSS, { 'Content-Type': 'text/css; charset=utf-8', ETag: CSS_ETAG });
      }
      break;
    case '/app.js':
      send(res, 200, APP_JS, { 'Content-Type': 'text/javascript; charset=utf-8' });
      break;
    case '/logo.svg':
      send(res, 200, LOGO_SVG, { 'Content-Type': 'image/svg+xml' });
      break;
    case '/api/products':
      sendJson(res, 200, {
        items: [
          { id: 1, name: 'Keyboard' },
          { id: 2, name: 'Mouse' },
        ],
      });
      break;
    case '/api/user':
      sendJson(res, 200, { name: 'Ada Lovelace', admin: true });
      break;
    case '/api/legacy':
      sendJson(res, 200, { ok: true, via: 'xhr' });
      break;
    case '/api/missing':
      sendJson(res, 404, { error: 'not found' });
      break;
    case '/api/server-error':
      sendJson(res, 500, { error: 'internal failure' });
      break;
    case '/redirect-1':
      send(res, 301, '', { Location: '/redirect-2' });
      break;
    case '/redirect-2':
      send(res, 302, '', { Location: '/api/products' });
      break;
    default:
      sendJson(res, 404, { error: 'unknown fixture route' });
  }
});

/* --------------------------- cross-origin API ----------------------------- */

const crossServer = createServer((req, res) => {
  const cors = {
    'Access-Control-Allow-Origin': `http://localhost:${PORT}`,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-WebTrace-Demo',
    'Access-Control-Max-Age': '600',
  };
  const url = (req.url ?? '/').split('?')[0];

  if (url === '/api/checkout') {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors);
      res.end();
      return;
    }
    sendJson(res, 200, { orderId: 'wt_123', status: 'created' }, cors);
    return;
  }
  sendJson(res, 404, { error: 'unknown cross fixture route' }, cors);
});

mainServer.listen(PORT, () => {
  console.log(`fixture site   → http://localhost:${PORT}`);
});
crossServer.listen(CROSS_PORT, () => {
  console.log(`cross-origin api → ${CROSS_ORIGIN}`);
});
