/**
 * Learning Mode curriculum — structured lessons that run against concepts the
 * learner is literally watching in live traffic. Each lesson: concept sections,
 * a short quiz with instant-feedback explanations, and glossary terms.
 *
 * Content rules: accurate, honest about what browsers expose, and short enough
 * to finish in a coffee sip.
 */

import type { GlossaryTerm } from '../explain/glossary';

export interface LessonSection {
  heading: string;
  body: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  /** Index into options. */
  answer: number;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  category: 'Foundations' | 'Protocols' | 'Browser' | 'Privacy & Performance';
  minutes: number;
  summary: string;
  sections: LessonSection[];
  quiz: QuizQuestion[];
  /** GLOSSARY keys related to this lesson. */
  terms: string[];
}

export const LESSONS: Lesson[] = [
  {
    id: 'life-of-a-page-load',
    title: 'The life of a page load',
    category: 'Foundations',
    minutes: 4,
    summary:
      'From "user pressed Enter" to "pixels on screen" — and every request in between.',
    sections: [
      {
        heading: '1. The document comes first',
        body: 'Everything starts with one request: the HTML document. Until the browser starts reading it, it knows nothing about the stylesheets, scripts, images or APIs the page will need.',
      },
      {
        heading: '2. Discovery by parsing',
        body: 'As the parser reads the HTML, it discovers referenced resources — a stylesheet here, a script there — and requests them. Those requests were not listed anywhere; they were *learned* by reading the document.',
      },
      {
        heading: '3. JavaScript takes over',
        body: 'Once scripts execute, the page starts acting on its own: fetching JSON APIs, sending analytics, opening WebSockets. This is why most requests on a modern page happen *after* the document arrives.',
      },
      {
        heading: '4. State and UI',
        body: 'Responses feed application state, state drives the UI, and sometimes the UI triggers more requests. In WebTrace you can watch this cascade happen in real time in the Live Flow.',
      },
    ],
    quiz: [
      {
        question: 'On a typical modern page, when do most API calls happen?',
        options: [
          'Before the HTML document is requested',
          'While the DNS lookup runs',
          'After scripts execute, as the app initializes',
          'Only when the user clicks something',
        ],
        answer: 2,
        explanation:
          'The document loads first, then scripts run and fetch the data they need. That is why API calls cluster right after the script requests in the flow graph.',
      },
      {
        question: 'How does the browser discover stylesheets and images?',
        options: [
          'They are all requested upfront by the browser',
          'By parsing the HTML document (and later, CSS/JS)',
          'The server pushes them automatically',
          'The operating system provides them',
        ],
        answer: 1,
        explanation:
          'Discovery is iterative: each parsed file reveals more resources to request.',
      },
    ],
    terms: ['navigation', 'document', 'initiator', 'Fetch / XHR'],
  },
  {
    id: 'http-methods-statuses',
    title: 'HTTP methods & status codes',
    category: 'Foundations',
    minutes: 5,
    summary: 'The two sentences of every request: "what do you want?" and "how did that go?"',
    sections: [
      {
        heading: 'Methods are verbs',
        body: 'GET reads, POST creates/submits, PUT replaces, PATCH modifies, DELETE removes. GET is "safe" — it should not change server state; that is why browsers preflight or cache GETs more eagerly.',
      },
      {
        heading: 'Status classes tell the story shape',
        body: '1xx informational · 2xx success · 3xx redirect · 4xx client error (the server understood, the request was wrong) · 5xx server error (the request was fine, the server stumbled).',
      },
      {
        heading: 'The famous few',
        body: '200 OK · 201 Created · 204 No Content · 301/308 permanent redirect · 302/307 temporary redirect · 304 Not Modified (your cached copy is still good) · 401 unauthenticated · 403 unauthorized · 404 not found · 429 rate limited · 500 server error.',
      },
    ],
    quiz: [
      {
        question: '401 vs 403 — what is the difference?',
        options: [
          '401 means "who are you?" — 403 means "I know you, but no."',
          'They are synonyms from different HTTP versions',
          '401 is a network error, 403 is an application error',
          '403 is only used for CORS failures',
        ],
        answer: 0,
        explanation:
          '401 = unauthenticated (log in first). 403 = authenticated but not permitted. Pages usually react to 401 with a login flow.',
      },
      {
        question: 'A request returned 204. What came back?',
        options: [
          'An empty JSON object',
          'Success, with no body to read',
          'A partial download',
          'A redirect to the real resource',
        ],
        answer: 1,
        explanation:
          '204 No Content is a success with an empty body — common for DELETEs and CORS preflight answers.',
      },
    ],
    terms: ['401', '404', 'JSON', '304'],
  },
  {
    id: 'redirects',
    title: 'Redirects: when the answer is "ask over there"',
    category: 'Protocols',
    minutes: 3,
    summary: '301, 302, 307, 308 — and why your URL bar changes.',
    sections: [
      {
        heading: 'The mechanics',
        body: 'A 3xx response carries a Location header pointing somewhere else. The browser (usually) automatically sends a new request there — WebTrace shows every hop as its own node, linked in a chain.',
      },
      {
        heading: 'Permanent vs temporary',
        body: '301 and 308 are permanent: caches and search engines should remember the new address. 302 and 307 are temporary: come back next time. The difference between 301/302 and 307/308 is whether the method and body must survive the hop (POST stays POST with 307/308).',
      },
      {
        heading: 'Why chains hurt',
        body: 'Each hop is a full extra round-trip. A redirect chain of three adds real latency on every visit — WebTrace makes chains impossible to miss in the graph.',
      },
    ],
    quiz: [
      {
        question: 'Which redirect says "this moved forever, update your bookmarks"?',
        options: ['302', '301', '404', '204'],
        answer: 1,
        explanation:
          '301 (and 308) are permanent redirects; clients are allowed to cache them aggressively.',
      },
    ],
    terms: ['redirect'],
  },
  {
    id: 'caching',
    title: 'Caching & the 304 handshake',
    category: 'Protocols',
    minutes: 5,
    summary: 'Why the second visit is faster — and what "Not Modified" really means.',
    sections: [
      {
        heading: 'The cache is a middleman',
        body: 'Before hitting the network, the browser checks its HTTP cache. If a stored copy is still fresh (Cache-Control max-age, Expires), it is used instantly — WebTrace marks those requests as from cache, with no download phase.',
      },
      {
        heading: 'Revalidation: the 304 dance',
        body: 'If the copy is stale, the browser asks "mine is version X — still good?" (If-None-Match: ETag / If-Modified-Since). If yes: 304 Not Modified — no body travels, the cached copy is reused. If no: 200 with a fresh body.',
      },
      {
        heading: 'Reading it in WebTrace',
        body: 'Open the Timeline: a 304 has almost no download phase. Open the headers in the details drawer: the request carries If-None-Match, the response says 304 with an ETag.',
      },
    ],
    quiz: [
      {
        question: 'What does the browser send to revalidate a cached resource?',
        options: [
          'The entire cached file back to the server',
          'If-None-Match with the stored ETag',
          'A POST with a checksum',
          'Nothing — 304s happen by themselves',
        ],
        answer: 1,
        explanation:
          'The ETag is a version fingerprint. If it still matches, the server answers 304 and sends nothing else.',
      },
      {
        question: 'A request was served "from cache". What actually traveled the network?',
        options: [
          'The headers only',
          'Nothing — the response came from local storage',
          'Just the status code',
          'A compressed diff',
        ],
        answer: 1,
        explanation:
          'A true cache hit never touches the network. That is why it is nearly instant.',
      },
    ],
    terms: ['cache', '304'],
  },
  {
    id: 'cors-preflights',
    title: 'CORS & preflights: the bouncer of the web',
    category: 'Browser',
    minutes: 6,
    summary: 'Why reading a cross-origin response is a privilege, not a right.',
    sections: [
      {
        heading: 'Sending ≠ reading',
        body: 'Browsers will happily SEND a request anywhere. But letting a page READ a response from another origin is dangerous — imagine any website reading your webmail. So the server must opt in with Access-Control-Allow-Origin.',
      },
      {
        heading: 'The preflight',
        body: 'For "non-simple" requests (custom headers, PUT/DELETE, JSON content-type), the browser first sends an OPTIONS request: "May I send POST with header X-WebTrace-Demo?" Only if the server answers correctly does the real request go out. In WebTrace, a preflight is the OPTIONS node feeding the real request — look for it in the fixture demo.',
      },
      {
        heading: 'When it fails',
        body: 'The request may succeed on the wire but the page still cannot read the response — the browser blocks it. That is why CORS errors look so confusing in consoles: the network tab shows 200, the page sees nothing.',
      },
    ],
    quiz: [
      {
        question: 'When does the browser send an OPTIONS preflight?',
        options: [
          'For every cross-origin request',
          'Only when the request is "non-simple" (custom headers, some methods/content types)',
          'Only for GET requests',
          'Only when the server has no TLS certificate',
        ],
        answer: 1,
        explanation:
          'Simple GETs/POSTs with simple headers skip the preflight. Custom headers like X-WebTrace-Demo trigger it.',
      },
      {
        question: 'The network tab shows a cross-origin response with status 200, but the page got a CORS error. What happened?',
        options: [
          'The server lied about the status',
          'The response arrived but its headers did not allow this origin, so the browser blocked the page from reading it',
          'The browser converted it to a 403',
          'The request was retried and failed',
        ],
        answer: 1,
        explanation:
          'Delivery and readability are different things. Access-Control-Allow-Origin decides who may read the response.',
      },
    ],
    terms: ['CORS', 'preflight', 'blocked request'],
  },
  {
    id: 'dns-tls',
    title: 'DNS & TLS: the invisible warm-up',
    category: 'Protocols',
    minutes: 4,
    summary: 'Everything that must happen before a single HTTP byte moves.',
    sections: [
      {
        heading: 'DNS: name → address',
        body: 'The browser turns "example.com" into an IP address. If DNS is slow, every request to that host waits — the browser caches answers, but a cold lookup costs real time. Extensions cannot see DNS packets; that is why WebTrace never claims to.',
      },
      {
        heading: 'TLS: agreeing on secrets',
        body: 'For HTTPS, browser and server negotiate encryption and verify the certificate. Certificate failures (expired, wrong domain, untrusted authority) stop the request before any HTTP happens — WebTrace decodes these as ERR_CERT_*/ERR_SSL_* stories.',
      },
      {
        heading: 'Reuse helps twice',
        body: 'Connections (and their warm-up cost) are reused across requests via keep-alive. First request to a host pays the toll; the rest ride the open connection.',
      },
    ],
    quiz: [
      {
        question: 'What must happen before the browser can send its first HTTPS request to a new host?',
        options: [
          'The server must render the page',
          'A DNS lookup and a TLS handshake',
          'The browser must receive a 304',
          'A preflight OPTIONS request',
        ],
        answer: 1,
        explanation:
          'Resolve the name, secure the channel — then HTTP can flow. Both steps are invisible to plain webRequest.',
      },
    ],
    terms: ['DNS', 'TLS'],
  },
  {
    id: 'third-parties',
    title: 'Third parties: who else is in the room?',
    category: 'Privacy & Performance',
    minutes: 4,
    summary: 'Your page talks to more hosts than you think. Here is how to see them.',
    sections: [
      {
        heading: 'First vs third party',
        body: 'A request to a host different from the page\'s own site is third-party: CDNs, fonts, analytics, ads, payment SDKs. WebTrace classifies every request and shows the hosts in the popup and the Third-Party Map.',
      },
      {
        heading: 'Why it matters',
        body: 'Each third party adds DNS/TLS warm-up, blocking scripts can delay rendering, and every host learns something about visitors. Reducing and lazy-loading third parties is one of the highest-leverage performance wins.',
      },
      {
        heading: 'The honest caveat',
        body: 'WebTrace groups by host (approximated registrable domain) — it cannot see cookies inside encrypted traffic or what the third party does with the data. It shows structure, not surveillance.',
      },
    ],
    quiz: [
      {
        question: 'The page is example.com. Which request is third-party?',
        options: [
          'example.com/api/products',
          'cdn.example.com/lib.js',
          'fonts.googleapis.com/css',
          'example.com:8443/status',
        ],
        answer: 2,
        explanation:
          'cdn.example.com shares the registrable domain (example.com) — first party. fonts.googleapis.com is a different site entirely.',
      },
    ],
    terms: ['third-party'],
  },
  {
    id: 'websockets-sse',
    title: 'WebSockets & SSE: when the server talks first',
    category: 'Browser',
    minutes: 4,
    summary: 'Two ways a connection stops being question-and-answer.',
    sections: [
      {
        heading: 'WebSocket: a two-way line',
        body: 'A WebSocket starts as an HTTP request (the handshake — visible in WebTrace as a websocket-type request) and then upgrades into a persistent connection where both sides can send messages anytime: chat, games, live dashboards.',
      },
      {
        heading: 'SSE: a one-way stream',
        body: 'Server-Sent Events keep an HTTP response open forever and push named events down it. One-way, but simpler — perfect for notifications and feeds.',
      },
      {
        heading: 'Seeing them honestly',
        body: 'Plain webRequest shows the WebSocket handshake, not the frames — WebTrace labels what it knows and does not invent messages it cannot see. (Frame capture is planned for the opt-in advanced mode.)',
      },
    ],
    quiz: [
      {
        question: 'Which technology gives the SERVER the ability to push to the client?',
        options: [
          'A plain GET request',
          'Both WebSocket and SSE',
          'Only SSE',
          'Neither — clients must always poll',
        ],
        answer: 1,
        explanation:
          'WebSocket is fully bidirectional; SSE is one-way server→client. Both eliminate polling.',
      },
    ],
    terms: ['Fetch / XHR'],
  },
];

export function lessonById(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export interface LessonProgressEntry {
  completed: boolean;
  correct: number;
  total: number;
}

export type LessonProgress = Record<string, LessonProgressEntry>;

export function lessonProgressSummary(progress: LessonProgress): {
  completed: number;
  total: number;
} {
  return {
    completed: LESSONS.filter((l) => progress[l.id]?.completed).length,
    total: LESSONS.length,
  };
}

export type { GlossaryTerm };
