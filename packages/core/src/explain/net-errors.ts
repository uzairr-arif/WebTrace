/**
 * Plain-language notes for network-level errors (net::ERR_*). Every note is
 * a careful, honest explanation of what the browser reported — not a guess
 * about application internals.
 */

export const NET_ERROR_NOTES: Record<string, string> = {
  ERR_NAME_NOT_RESOLVED:
    'The hostname could not be resolved — DNS lookup failed. Check the domain name and your DNS settings.',
  ERR_CONNECTION_REFUSED:
    'The server refused the connection. It may be down, or nothing is listening on that port.',
  ERR_CONNECTION_RESET:
    'The connection was reset mid-conversation — the other side (or something between you and it) dropped the connection.',
  ERR_CONNECTION_TIMED_OUT:
    'The connection attempt timed out. The server did not answer in time.',
  ERR_TIMED_OUT: 'The request timed out.',
  ERR_SSL_PROTOCOL_ERROR:
    'The TLS handshake failed — browser and server could not agree on a secure connection.',
  ERR_CERT_COMMON_NAME_INVALID:
    'The TLS certificate does not match this domain name.',
  ERR_CERT_AUTHORITY_INVALID:
    'The TLS certificate was not issued by a authority the browser trusts.',
  ERR_CERT_DATE_INVALID:
    'The TLS certificate is expired or not yet valid.',
  ERR_BLOCKED_BY_CLIENT:
    'The request was blocked by the browser or an extension — commonly an ad blocker or privacy extension.',
  ERR_BLOCKED_BY_ADMINISTRATOR:
    'The request was blocked by system or network policy.',
  ERR_BLOCKED_BY_RESPONSE:
    'The response was blocked by the browser’s cross-origin protections (ORB) — the response’s content did not match what its headers allowed.',
  ERR_ABORTED: 'The request was cancelled before it finished.',
  ERR_EMPTY_RESPONSE: 'The server closed the connection without sending any data.',
  ERR_CONTENT_DECODING_FAILED:
    'The response content-encoding could not be decoded — the server sent compressed data that was malformed.',
  ERR_HTTP2_PROTOCOL_ERROR:
    'The server violated the HTTP/2 protocol.',
  ERR_PROXY_CONNECTION_FAILED:
    'The configured proxy could not be reached.',
  ERR_INVALID_URL: 'The URL was malformed.',
  ERR_ADDRESS_UNREACHABLE: 'The server’s address is unreachable from this network.',
};

/** Glossary terms worth highlighting for specific error codes. */
export const NET_ERROR_TERMS: Record<string, string[]> = {
  ERR_NAME_NOT_RESOLVED: ['DNS'],
  ERR_SSL_PROTOCOL_ERROR: ['TLS'],
  ERR_CERT_COMMON_NAME_INVALID: ['TLS'],
  ERR_CERT_AUTHORITY_INVALID: ['TLS'],
  ERR_CERT_DATE_INVALID: ['TLS'],
  ERR_BLOCKED_BY_CLIENT: ['blocked request'],
  ERR_BLOCKED_BY_RESPONSE: ['CORS', 'blocked request'],
};
