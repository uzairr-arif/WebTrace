import {
  computeWaterfall,
  explainRequest,
  CATEGORY_META,
  type NavigationRecord,
  type RequestRecord,
} from '@webtrace/core';
import { useMemo } from 'react';
import { CategoryDot, EvidenceBadge, StatusPill } from '../Badges';
import { Term } from '../Term';
import { isFailed } from './shared';

export function DetailsDrawer({
  record,
  navigations,
  requests,
  onClose,
}: {
  record: RequestRecord;
  navigations: NavigationRecord[];
  requests: RequestRecord[];
  onClose: () => void;
}) {
  const explanation = useMemo(
    () => explainRequest(record, navigations, requests),
    [record, navigations, requests],
  );
  const waterfall = useMemo(() => computeWaterfall(record), [record]);
  const failed = isFailed(record);

  return (
    <aside className="absolute inset-y-0 right-0 z-40 flex w-[340px] flex-col border-l border-line bg-surface shadow-2xl">
      {/* header */}
      <div className="flex items-start gap-2 border-b border-line px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <CategoryDot category={record.category} />
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
              {CATEGORY_META[record.category].label}
            </span>
          </div>
          <p className="mt-0.5 truncate font-mono text-[12px] font-semibold text-ink" title={record.url}>
            {record.method} {record.path}
          </p>
          <p className="truncate text-[10px] text-faint" title={record.url}>{record.host}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-faint transition-colors hover:bg-raised hover:text-ink"
          aria-label="Close details"
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
        {/* meta */}
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          <Meta label="Status">
            <StatusPill status={record.status} error={record.error} />
            <span className="ml-1.5 text-dim">{statusText(record)}</span>
          </Meta>
          <Meta label="Duration">
            <span className="font-mono text-ink">
              {record.durationMs !== undefined ? `${Math.round(record.durationMs)} ms` : '…'}
            </span>
          </Meta>
          <Meta label="From cache">
            <span className={record.fromCache ? 'text-ok' : 'text-dim'}>{record.fromCache ? 'Yes' : 'No'}</span>
          </Meta>
          <Meta label="Server IP">
            <span className="truncate font-mono text-dim">{record.ip ?? '—'}</span>
          </Meta>
          <Meta label="Site">
            <span className={record.thirdParty ? 'text-warn' : 'text-dim'}>
              {record.thirdParty ? 'Third-party' : record.documentHost ? 'First-party' : '—'}
            </span>
          </Meta>
          <Meta label="Redirect hop">
            <span className="text-dim">{record.hopIndex > 0 ? `#${record.hopIndex + 1}` : 'first'}</span>
          </Meta>
        </div>

        {/* waterfall */}
        <Section title="Timing">
          <div className="flex h-2.5 w-full overflow-hidden rounded-sm bg-raised">
            {waterfall.phases.map((p, i) => (
              <span
                key={i}
                style={{
                  width: `${((p.endMs - p.startMs) / Math.max(waterfall.totalMs, 1)) * 100}%`,
                  background:
                    p.kind === 'queued'
                      ? 'var(--wt-faint)'
                      : p.kind === 'wait'
                        ? 'var(--wt-accent)'
                        : 'var(--wt-ok)',
                  opacity: 0.85,
                }}
              />
            ))}
          </div>
          <p className="mt-1 text-[10.5px] leading-relaxed text-dim">
            {waterfall.dominant === 'wait' && 'Most of the time went to waiting for the server to start responding.'}
            {waterfall.dominant === 'download' && 'Most of the time went to downloading the response body.'}
            {waterfall.dominant === 'queued' && 'Most of the time went to preparing and sending the request.'}
            {waterfall.dominant === undefined && 'Not enough data yet.'}
            {waterfall.approx && ' (approximate — advanced instrumentation gives exact phases)'}
          </p>
        </Section>

        {/* why */}
        <Section title="Why did this happen?">
          <ol className="space-y-0">
            {explanation.steps.map((step, i) => (
              <li key={i} className="relative flex gap-2 pb-2.5 last:pb-0">
                {i < explanation.steps.length - 1 && (
                  <span className="absolute left-[3px] top-3 h-full w-px bg-line" aria-hidden="true" />
                )}
                <span
                  className="relative mt-1 size-[7px] shrink-0 rounded-full border border-line bg-raised"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-[11px] leading-relaxed text-ink">{renderTerms(step.text, step.terms)}</p>
                  <div className="mt-0.5"><EvidenceBadge source={step.source} /></div>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* headers */}
        <Section title={`Request headers${record.requestHeaders ? '' : ' (not captured)'}`}>
          <HeaderList headers={record.requestHeaders} />
        </Section>
        <Section title={`Response headers${record.responseHeaders ? '' : ' (not captured)'}`}>
          <HeaderList headers={record.responseHeaders} />
        </Section>

        {failed && (
          <p className="mb-2 rounded-md border border-err/30 bg-err/5 px-2 py-1.5 text-[10.5px] leading-relaxed text-err">
            This request did not complete successfully
            {record.error ? ` — the browser reported ${record.error}.` : ` — HTTP ${record.status}.`}
          </p>
        )}
      </div>
    </aside>
  );
}

function statusText(record: RequestRecord): string {
  if (record.error) return record.error.replace(/^net::/, '');
  if (record.status === 304) return 'Not Modified';
  if (record.status === 200) return 'OK';
  if (record.status === 404) return 'Not Found';
  if (record.status === 401) return 'Unauthorized';
  if (record.status === 403) return 'Forbidden';
  if (record.status === 429) return 'Too Many Requests';
  if (record.status === 500) return 'Server Error';
  return record.status !== undefined ? '' : 'incomplete';
}

function renderTerms(text: string, terms?: string[]): React.ReactNode {
  if (!terms || terms.length === 0) return text;
  let out: React.ReactNode = text;
  for (const term of terms) {
    if (!text.includes(term)) continue;
    const parts = out.toString().split(term);
    if (parts.length < 2) continue;
    const rebuilt: React.ReactNode[] = [];
    parts.forEach((part, i) => {
      rebuilt.push(part);
      if (i < parts.length - 1) {
        rebuilt.push(
          <Term key={`${term}-${i}`} termKey={term}>
            {term}
          </Term>,
        );
      }
    });
    out = rebuilt;
  }
  return out;
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line/70 bg-bg/40 px-2 py-1">
      <p className="text-[9px] uppercase tracking-wider text-faint">{label}</p>
      <p className="mt-0.5 flex items-center text-[11px]">{children}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-3 mt-3">
      <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">{title}</h3>
      {children}
    </section>
  );
}

function HeaderList({ headers }: { headers?: Record<string, string> }) {
  if (!headers) {
    return <p className="text-[11px] text-faint">No headers stored for this record.</p>;
  }
  return (
    <div className="overflow-hidden rounded-md border border-line">
      {Object.entries(headers).map(([name, value], i) => {
        const redacted = value === '••••••••';
        return (
          <div
            key={`${name}-${i}`}
            className={`flex gap-2 px-2 py-1 font-mono text-[10px] ${i % 2 === 0 ? 'bg-bg/40' : ''}`}
          >
            <span className="w-32 shrink-0 truncate text-dim" title={name}>{name}</span>
            <span className={`min-w-0 flex-1 break-all ${redacted ? 'text-warn' : 'text-ink'}`} title={value}>
              {value === '' ? '—' : value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
