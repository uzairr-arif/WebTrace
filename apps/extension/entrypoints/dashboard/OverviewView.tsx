import {
  CATEGORY_META,
  REQUEST_CATEGORIES,
  type NavigationRecord,
  type RequestCategory,
  type RequestRecord,
  type SessionStats,
} from '@webtrace/core';
import { useMemo } from 'react';
import { isFailed } from '../../components/views/shared';

export function OverviewView({
  requests,
  navigations,
  stats,
  replaying,
  onOpenLearn,
}: {
  requests: RequestRecord[];
  navigations: NavigationRecord[];
  stats: SessionStats;
  replaying: boolean;
  onOpenLearn: () => void;
}) {
  const timeBuckets = useMemo(() => buildTimeBuckets(requests), [requests]);
  const statusMix = useMemo(() => buildStatusMix(requests), [requests]);
  const topHosts = useMemo(() => buildTopHosts(requests), [requests]);
  const recentPages = useMemo(
    () => navigations.filter((n) => n.frameId === 0).slice(-5).reverse(),
    [navigations],
  );

  const apiCount = stats.byCategory.xhr;
  const avgDuration = useMemo(() => {
    const timed = requests.filter((r) => r.durationMs !== undefined);
    if (timed.length === 0) return null;
    return Math.round(timed.reduce((sum, r) => sum + (r.durationMs ?? 0), 0) / timed.length);
  }, [requests]);

  return (
    <div className="h-full overflow-y-auto p-4">
      {/* stat cards */}
      <div className="grid grid-cols-3 gap-3 xl:grid-cols-6">
        <StatCard label="Requests" value={stats.total} />
        <StatCard label="Fetch / XHR" value={apiCount} accent />
        <StatCard label="Errors" value={stats.errors} error={stats.errors > 0} />
        <StatCard label="Third-party hosts" value={stats.thirdPartyHosts.length} />
        <StatCard label="From cache" value={stats.cached} ok={stats.cached > 0} />
        <StatCard label="Avg duration" value={avgDuration !== null ? `${avgDuration}ms` : '—'} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
        {/* requests over time */}
        <ChartCard title="Requests over time" className="xl:col-span-2">
          {timeBuckets.length > 0 ? (
            <div className="flex h-28 items-end gap-px">
              {timeBuckets.map((count, i) => (
                <div
                  key={i}
                  className="min-w-[3px] flex-1 rounded-t-sm bg-accent/70 transition-all"
                  style={{ height: `${Math.max((count / Math.max(...timeBuckets, 1)) * 100, count > 0 ? 4 : 1)}%` }}
                  title={`${count} request${count === 1 ? '' : 's'}`}
                />
              ))}
            </div>
          ) : (
            <Empty>"No activity yet."</Empty>
          )}
          <p className="mt-1 text-[10px] text-faint">
            {replaying ? 'Stored session — events replayed from local storage.' : 'Live — buckets fill as requests happen.'}
          </p>
        </ChartCard>

        {/* status codes */}
        <ChartCard title="Status codes">
          {statusMix.total > 0 ? (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full">
                {statusMix.segments.map((s) => (
                  <span
                    key={s.label}
                    style={{ width: `${(s.count / statusMix.total) * 100}%`, background: s.color }}
                    title={`${s.label}: ${s.count}`}
                  />
                ))}
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                {statusMix.segments.map((s) => (
                  <p key={s.label} className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-dim">
                      <i className="inline-block size-2 rounded-sm" style={{ background: s.color }} />
                      {s.label}
                    </span>
                    <span className="font-mono">{s.count}</span>
                  </p>
                ))}
              </div>
            </>
          ) : (
            <Empty>"No responses yet."</Empty>
          )}
        </ChartCard>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-3">
        {/* categories */}
        <ChartCard title="Resource categories">
          <div className="space-y-1.5">
            {REQUEST_CATEGORIES.filter((c) => stats.byCategory[c] > 0).map((c) => (
              <CategoryBar key={c} category={c} count={stats.byCategory[c]} total={stats.total} />
            ))}
            {stats.total === 0 && <Empty>"Nothing to break down yet."</Empty>}
          </div>
        </ChartCard>

        {/* top hosts */}
        <ChartCard title="Top hosts">
          <div className="space-y-1.5">
            {topHosts.map((h) => (
              <div key={h.host} className="flex items-center gap-2 text-[11.5px]">
                <span className={`size-2 shrink-0 rounded-full ${h.thirdParty ? 'bg-warn' : 'bg-ok'}`} />
                <span className="min-w-0 flex-1 truncate font-mono" title={h.host}>{h.host}</span>
                <span className="font-mono text-faint">{h.count}</span>
              </div>
            ))}
            {topHosts.length === 0 && <Empty>"No hosts yet."</Empty>}
          </div>
          <p className="mt-2 text-[10px] text-faint">
            <span className="mr-1 inline-block size-2 rounded-full bg-ok align-middle" /> first-party
            <span className="ml-3 mr-1 inline-block size-2 rounded-full bg-warn align-middle" /> third-party
          </p>
        </ChartCard>

        {/* recent pages */}
        <ChartCard title="Pages loaded">
          <div className="space-y-1.5">
            {recentPages.map((n) => (
              <div key={n.id} className="flex items-center gap-2 text-[11.5px]">
                <span className="min-w-0 flex-1 truncate font-mono" title={n.url}>
                  {n.host}
                  <span className="text-faint">{n.path === '/' ? '' : n.path}</span>
                </span>
                {n.isHistory && <span className="text-[9px] text-faint">history</span>}
              </div>
            ))}
            {recentPages.length === 0 && <Empty>"No navigations recorded yet."</Empty>}
          </div>
          {!replaying && (
            <button
              type="button"
              onClick={onOpenLearn}
              className="mt-3 w-full rounded-lg border border-accent/40 bg-accent-soft px-3 py-2 text-left text-[11.5px] text-accent transition-opacity hover:opacity-85"
            >
              📖 Understand what you're seeing — open the lessons
            </button>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

/* ------------------------------- helpers -------------------------------- */

function StatCard({
  label,
  value,
  accent,
  error,
  ok,
}: {
  label: string;
  value: number | string;
  accent?: boolean;
  error?: boolean;
  ok?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-3">
      <p
        className={`font-mono text-[20px] font-semibold leading-none ${
          error ? 'text-err' : accent ? 'text-accent' : ok ? 'text-ok' : 'text-ink'
        }`}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[10px] uppercase tracking-wider text-faint">{label}</p>
    </div>
  );
}

function ChartCard({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border border-line bg-surface p-3.5 ${className}`}>
      <h3 className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-faint">{title}</h3>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-[11.5px] text-faint">{children}</p>;
}

function CategoryBar({
  category,
  count,
  total,
}: {
  category: RequestCategory;
  count: number;
  total: number;
}) {
  const meta = CATEGORY_META[category];
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-20 shrink-0 truncate text-dim">{meta.label}</span>
      <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-raised">
        <span
          className="block h-full rounded-full"
          style={{ width: `${(count / Math.max(total, 1)) * 100}%`, background: `var(${meta.colorVar})` }}
        />
      </span>
      <span className="w-8 text-right font-mono text-faint">{count}</span>
    </div>
  );
}

function buildTimeBuckets(requests: RequestRecord[]): number[] {
  const timed = requests.filter((r) => r.startedAt !== undefined);
  if (timed.length === 0) return [];
  const t0 = Math.min(...timed.map((r) => r.startedAt ?? 0));
  const t1 = Math.max(
    ...timed.map((r) => r.completedAt ?? r.failedAt ?? r.startedAt ?? 0),
  );
  const span = Math.max(t1 - t0, timed.length);
  const buckets = new Array<number>(48).fill(0);
  for (const r of timed) {
    const idx = Math.min(47, Math.floor((((r.startedAt ?? 0) - t0) / span) * 48));
    buckets[idx] += 1;
  }
  return buckets;
}

interface StatusSegment {
  label: string;
  color: string;
  count: number;
}

function buildStatusMix(requests: RequestRecord[]): { segments: StatusSegment[]; total: number } {
  let s2 = 0, s3 = 0, s4 = 0, s5 = 0, netErr = 0, other = 0;
  for (const r of requests) {
    if (r.isPreflight) continue;
    if (r.error) netErr += 1;
    else if (r.status === undefined) other += 1;
    else if (r.status < 300) s2 += 1;
    else if (r.status < 400) s3 += 1;
    else if (r.status < 500) s4 += 1;
    else s5 += 1;
  }
  const total = s2 + s3 + s4 + s5 + netErr + other;
  return {
    total,
    segments: [
      { label: '2xx success', color: 'var(--wt-ok)', count: s2 },
      { label: '3xx redirect', color: 'var(--wt-warn)', count: s3 },
      { label: '4xx client error', color: '#ef8a8a', count: s4 },
      { label: '5xx server error', color: 'var(--wt-err)', count: s5 },
      { label: 'network failure', color: 'var(--wt-faint)', count: netErr + other },
    ].filter((s) => s.count > 0),
  };
}

function buildTopHosts(requests: RequestRecord[]): Array<{ host: string; count: number; thirdParty: boolean }> {
  const map = new Map<string, { count: number; thirdParty: boolean }>();
  for (const r of requests) {
    if (!r.host || r.isPreflight) continue;
    const entry = map.get(r.host) ?? { count: 0, thirdParty: false };
    entry.count += 1;
    entry.thirdParty = entry.thirdParty || r.thirdParty === true;
    map.set(r.host, entry);
  }
  return [...map.entries()]
    .map(([host, v]) => ({ host, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}
