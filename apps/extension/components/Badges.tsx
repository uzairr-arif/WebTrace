import type { RequestCategory } from '@webtrace/core';
import { CATEGORY_META } from '@webtrace/core';

/** HTTP status pill with honest semantics (2xx ok, 3xx info, 4xx/5xx error). */
export function StatusPill({ status, error }: { status?: number; error?: string }) {
  if (error || status === undefined || status === 0) {
    return (
      <span className="inline-flex items-center rounded bg-err/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-err">
        {error ? 'ERR' : '—'}
      </span>
    );
  }
  const tone =
    status < 300
      ? 'bg-ok/15 text-ok'
      : status < 400
        ? 'bg-warn/15 text-warn'
        : 'bg-err/15 text-err';
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${tone}`}>
      {status}
    </span>
  );
}

/** Small colored dot for a request category. */
export function CategoryDot({ category }: { category: RequestCategory | 'navigation' }) {
  const color =
    category === 'navigation'
      ? 'var(--wt-accent)'
      : `var(${CATEGORY_META[category].colorVar})`;
  return (
    <span
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ background: color }}
      aria-hidden="true"
    />
  );
}

/** OBSERVED / DERIVED evidence badge — the honesty doctrine, visible. */
export function EvidenceBadge({ source }: { source: string }) {
  const observed = source === 'observed';
  const instrumented = source === 'instrumented';
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-1 py-px font-mono text-[9px] font-bold tracking-wide ${
        observed
          ? 'border-ok/40 text-ok'
          : instrumented
            ? 'border-warn/40 text-warn'
            : 'border-faint/40 text-faint'
      }`}
      title={
        observed
          ? 'The browser directly reported this.'
          : instrumented
            ? 'Reported by optional local instrumentation.'
            : 'WebTrace inferred this from observed events.'
      }
    >
      {observed ? 'OBSERVED' : instrumented ? 'INSTRUMENTED' : 'DERIVED'}
    </span>
  );
}
