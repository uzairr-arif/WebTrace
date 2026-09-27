/**
 * @webtrace/core — the browser-agnostic brain of WebTrace.
 *
 * Layers:
 *   events/      normalized TraceEvent model + browser-event translators
 *   redaction/   ingestion-time privacy gate
 *   correlation/ events → RequestRecords, navigations, stats
 *   graph/       records → interactive flow graph
 *   timeline/    records → waterfall phases
 *   explain/     records → honest "Why?" stories + learning glossary
 *   filters/     mini query language for the request list
 */

export * from './events/types';
export * from './events/normalize';

export * from './redaction/header';
export * from './redaction/redactor';

export * from './models/types';
export * from './models/categories';
export * from './models/hosts';

export * from './correlation/correlator';

export * from './graph/build';

export * from './timeline/waterfall';

export * from './explain/engine';
export * from './explain/glossary';
export * from './explain/net-errors';

export * from './learning/lessons';

export * from './filters/query';

export { uid } from './id';

export const CORE_VERSION = '0.1.0';
