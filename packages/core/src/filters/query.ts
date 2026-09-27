/**
 * Mini query language for the request list.
 *
 *   /api/                 free text — substring of the URL
 *   status:500            exact status
 *   status:4xx            status class
 *   type:fetch            category (aliases: fetch, api, js, css, img, …)
 *   method:POST           method
 *   domain:api.example.com host substring
 *   third-party:true      third-party only (false = first-party only)
 *   error:true            failed requests
 *   cached:true           served from cache
 *
 * Tokens combine with AND; bare words are free text.
 */

import { normalizeCategoryAlias } from '../models/categories';
import type { RequestRecord } from '../models/types';

export interface RequestFilter {
  text: string[];
  status?: number;
  statusClass?: number;
  type?: string;
  method?: string;
  domain?: string;
  thirdParty?: boolean;
  error?: boolean;
  cached?: boolean;
}

const EMPTY: RequestFilter = { text: [] };

export function parseQuery(input: string): RequestFilter {
  const filter: RequestFilter = { text: [] };
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const colon = token.indexOf(':');
    if (colon === -1) {
      filter.text.push(token.toLowerCase());
      continue;
    }
    const key = token.slice(0, colon).toLowerCase();
    const value = token.slice(colon + 1);
    if (value === '') {
      filter.text.push(token.toLowerCase());
      continue;
    }
    switch (key) {
      case 'status': {
        const classMatch = /^([1-5])xx$/i.exec(value);
        if (classMatch) {
          filter.statusClass = Number(classMatch[1]);
        } else {
          const n = Number(value);
          if (Number.isFinite(n)) filter.status = n;
          else filter.text.push(token.toLowerCase());
        }
        break;
      }
      case 'type': {
        const cat = normalizeCategoryAlias(value);
        filter.type = cat ?? value.toLowerCase();
        break;
      }
      case 'method':
        filter.method = value.toUpperCase();
        break;
      case 'domain':
      case 'host':
        filter.domain = value.toLowerCase();
        break;
      case 'third-party':
      case 'thirdparty':
        filter.thirdParty = parseBool(value);
        break;
      case 'error':
        filter.error = parseBool(value);
        break;
      case 'cached':
      case 'cache':
        filter.cached = parseBool(value);
        break;
      default:
        filter.text.push(token.toLowerCase());
    }
  }
  return filter;
}

export function isFilterEmpty(filter: RequestFilter): boolean {
  return (
    filter.text.length === 0 &&
    filter.status === undefined &&
    filter.statusClass === undefined &&
    filter.type === undefined &&
    filter.method === undefined &&
    filter.domain === undefined &&
    filter.thirdParty === undefined &&
    filter.error === undefined &&
    filter.cached === undefined
  );
}

export function matchesFilter(record: RequestRecord, filter: RequestFilter): boolean {
  for (const t of filter.text) {
    if (!record.url.toLowerCase().includes(t) && !record.method.toLowerCase().includes(t)) {
      return false;
    }
  }
  if (filter.status !== undefined && record.status !== filter.status) return false;
  if (
    filter.statusClass !== undefined &&
    (record.status === undefined || Math.floor(record.status / 100) !== filter.statusClass)
  ) {
    return false;
  }
  if (filter.type !== undefined && record.category !== filter.type) return false;
  if (filter.method !== undefined && record.method !== filter.method) return false;
  if (filter.domain !== undefined && !record.host.includes(filter.domain)) return false;
  if (filter.thirdParty !== undefined && record.thirdParty !== filter.thirdParty) return false;
  if (filter.error !== undefined) {
    const hasError = record.error !== undefined || (record.status !== undefined && record.status >= 400);
    if (hasError !== filter.error) return false;
  }
  if (filter.cached !== undefined && (record.fromCache ?? false) !== filter.cached) return false;
  return true;
}

export function applyFilter(records: RequestRecord[], query: string): RequestRecord[] {
  const filter = parseQuery(query);
  if (isFilterEmpty(filter)) return records;
  return records.filter((r) => matchesFilter(r, filter));
}

function parseBool(value: string): boolean | undefined {
  if (value === 'true' || value === 'yes' || value === '1') return true;
  if (value === 'false' || value === 'no' || value === '0') return false;
  return undefined;
}
