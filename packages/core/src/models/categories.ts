/**
 * Resource categorization + display metadata. The category is the backbone of
 * filters, stats, graph colors and the legend.
 */

import type { RequestCategory } from './types';

export const REQUEST_CATEGORIES: RequestCategory[] = [
  'document',
  'script',
  'stylesheet',
  'image',
  'font',
  'xhr',
  'websocket',
  'media',
  'other',
];

/**
 * Map the browser's raw resource type to a WebTrace category.
 * Note: plain webRequest cannot distinguish fetch() from XHR — both arrive as
 * "xmlhttprequest", so they share one category labeled "Fetch / XHR".
 */
export function categorize(resourceType: string | undefined, url?: string): RequestCategory {
  const t = (resourceType ?? '').toLowerCase();
  switch (t) {
    case 'main_frame':
    case 'sub_frame':
      return 'document';
    case 'script':
      return 'script';
    case 'stylesheet':
      return 'stylesheet';
    case 'image':
    case 'imageset':
      return 'image';
    case 'font':
      return 'font';
    case 'xmlhttprequest':
      return 'xhr';
    case 'websocket':
    case 'webtransport':
      return 'websocket';
    case 'media':
      return 'media';
    default:
      return guessFromExtension(url);
  }
}

function guessFromExtension(url: string | undefined): RequestCategory {
  if (!url) return 'other';
  const m = /\.([a-z0-9]+)(?:[?#]|$)/i.exec(url);
  const ext = m?.[1]?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'mjs':
      return 'script';
    case 'css':
      return 'stylesheet';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
    case 'avif':
    case 'svg':
    case 'ico':
      return 'image';
    case 'woff':
    case 'woff2':
    case 'ttf':
    case 'otf':
      return 'font';
    case 'mp4':
    case 'webm':
    case 'mp3':
    case 'ogg':
      return 'media';
    default:
      return 'other';
  }
}

export const CATEGORY_META: Record<RequestCategory, { label: string; colorVar: string }> = {
  document: { label: 'Document', colorVar: '--wt-cat-document' },
  script: { label: 'Script', colorVar: '--wt-cat-script' },
  stylesheet: { label: 'Stylesheet', colorVar: '--wt-cat-stylesheet' },
  image: { label: 'Image', colorVar: '--wt-cat-image' },
  font: { label: 'Font', colorVar: '--wt-cat-font' },
  xhr: { label: 'Fetch / XHR', colorVar: '--wt-cat-xhr' },
  websocket: { label: 'WebSocket', colorVar: '--wt-cat-websocket' },
  media: { label: 'Media', colorVar: '--wt-cat-media' },
  other: { label: 'Other', colorVar: '--wt-cat-other' },
};

/** Accepts friendly aliases so filters can say type:fetch, type:api, type:css. */
export function normalizeCategoryAlias(value: string): RequestCategory | undefined {
  const v = value.toLowerCase();
  switch (v) {
    case 'doc':
    case 'document':
    case 'html':
      return 'document';
    case 'js':
    case 'script':
      return 'script';
    case 'css':
    case 'style':
    case 'stylesheet':
      return 'stylesheet';
    case 'img':
    case 'image':
      return 'image';
    case 'font':
      return 'font';
    case 'api':
    case 'fetch':
    case 'xhr':
    case 'ajax':
      return 'xhr';
    case 'ws':
    case 'websocket':
      return 'websocket';
    case 'media':
      return 'media';
    case 'other':
      return 'other';
    default:
      return undefined;
  }
}
