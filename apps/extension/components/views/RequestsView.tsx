import type { RequestRecord } from '@webtrace/core';
import { CategoryDot, StatusPill } from '../Badges';
import { isFailed } from './shared';

export function RequestsView({
  requests,
  onSelect,
}: {
  requests: RequestRecord[];
  onSelect: (requestId: string) => void;
}) {
  const visible = requests.slice(0, 300);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-faint">
        <span className="w-8">St</span>
        <span className="w-10">Meth</span>
        <span className="flex-1">Path</span>
        <span className="w-12 text-right">Time</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {visible.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelect(r.id)}
            className={`flex w-full items-center gap-2 border-b border-line/50 px-2 py-1.5 text-left transition-colors hover:bg-raised ${
              isFailed(r) ? 'bg-err/5' : ''
            }`}
          >
            <span className="w-8"><StatusPill status={r.status} error={r.error} /></span>
            <span className="w-10 shrink-0 font-mono text-[10px] text-faint">{r.method}</span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <CategoryDot category={r.category} />
              <span className="truncate font-mono text-[11px] text-ink" title={r.url}>
                {r.hopIndex > 0 ? '↳ ' : ''}{r.path}
              </span>
              {r.thirdParty && (
                <span className="shrink-0 rounded-sm border border-warn/40 px-1 text-[8.5px] font-semibold text-warn">
                  3rd
                </span>
              )}
              {r.isPreflight && (
                <span className="shrink-0 rounded-sm border border-accent/40 px-1 text-[8.5px] font-semibold text-accent">
                  pre
                </span>
              )}
            </span>
            <span className="w-12 text-right font-mono text-[10px] text-faint">
              {r.durationMs !== undefined ? `${Math.max(1, Math.round(r.durationMs))}ms` : '…'}
            </span>
          </button>
        ))}
        {requests.length > visible.length && (
          <div className="px-2 py-2 text-center text-[10px] text-faint">
            Showing {visible.length} of {requests.length} — refine with the search box
          </div>
        )}
        {requests.length === 0 && (
          <div className="p-6 text-center text-[12px] text-dim">No requests match the current filters.</div>
        )}
      </div>
    </div>
  );
}
