import { applyFilter, type RequestRecord } from '@webtrace/core';
import { browser } from '#imports';
import { useMemo, useState } from 'react';
import { useAppSettings } from '../../components/ThemeProvider';
import { LogoMark } from '../../components/LogoMark';
import { applyChips } from '../../components/views/shared';
import { sendToBackground } from '../../lib/messages';
import { useTraceSession } from '../../lib/trace-client';
import { DetailsDrawer } from '../../components/views/DetailsDrawer';
import { FilterBar, type FilterChip } from '../../components/views/FilterBar';
import { FlowView } from '../../components/views/FlowView';
import { RequestsView } from '../../components/views/RequestsView';
import { TimelineView } from '../../components/views/TimelineView';

type ViewKey = 'flow' | 'requests' | 'timeline';

export function App() {
  const { status, tabId, requests, navigations, stats, clear } = useTraceSession();
  const { settings, setSetting } = useAppSettings();
  const [view, setView] = useState<ViewKey>('flow');
  const [query, setQuery] = useState('');
  const [chips, setChips] = useState<Set<FilterChip>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => applyChips(applyFilter(requests, query), chips),
    [requests, query, chips],
  );

  const selected = useMemo(
    () => requests.find((r) => r.id === selectedId) ?? null,
    [requests, selectedId],
  );

  const toggleChip = (chip: FilterChip) => {
    setChips((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg text-ink">
      {/* header */}
      <header className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2">
        <LogoMark />
        <span className="text-[13px] font-semibold tracking-tight">WebTrace</span>
        <span
          className={`ml-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-px font-mono text-[9px] font-bold ${
            status === 'live'
              ? 'border-ok/40 text-ok'
              : status === 'connecting'
                ? 'border-warn/40 text-warn'
                : 'border-faint/40 text-faint'
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${
              status === 'live' ? 'animate-pulse bg-ok' : status === 'connecting' ? 'bg-warn' : 'bg-faint'
            }`}
          />
          {status === 'live' ? 'LIVE' : status === 'connecting' ? '…' : 'NO TAB'}
        </span>
        <span className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              void sendToBackground({ type: 'webtrace:openDashboard' });
            }}
            title="Open the full dashboard"
            className="rounded-md border border-line px-1.5 py-1 text-[11px] leading-none text-dim transition-colors hover:text-accent"
          >
            ↗
          </button>
          <button
            type="button"
            onClick={() => setSetting('learningMode', !settings.learningMode)}
            title="Learning Mode — explain networking terms as you explore"
            className={`rounded-md border px-1.5 py-1 text-[11px] leading-none transition-colors ${
              settings.learningMode
                ? 'border-accent/60 bg-accent-soft text-accent'
                : 'border-line text-dim hover:text-ink'
            }`}
          >
            🧠
          </button>
          <button
            type="button"
            onClick={() => browser.runtime.openOptionsPage()}
            title="Options"
            className="rounded-md border border-line px-1.5 py-1 text-[11px] leading-none text-dim transition-colors hover:text-ink"
          >
            ⚙
          </button>
        </span>
      </header>

      {/* tabs */}
      <nav className="flex border-b border-line bg-surface px-2">
        {(
          [
            ['flow', 'Flow'],
            ['requests', `Requests${stats.total > 0 ? ` (${stats.total})` : ''}`],
            ['timeline', 'Timeline'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`-mb-px border-b-2 px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
              view === key
                ? 'border-accent text-accent'
                : 'border-transparent text-dim hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={clear}
          title="Clear this session"
          className="ml-auto self-center rounded px-1.5 py-0.5 text-[11px] text-faint transition-colors hover:text-err"
        >
          Clear
        </button>
      </nav>

      <FilterBar query={query} onQuery={setQuery} chips={chips} onToggleChip={toggleChip} />

      {/* content */}
      <main className="relative min-h-0 flex-1">
        {status === 'unavailable' ? (
          <EmptyState
            title="No active tab"
            body="Open a website, then reopen WebTrace from the extension menu."
          />
        ) : requests.length === 0 ? (
          <EmptyState
            title="Waiting for activity…"
            body="Browse a website — its requests will appear here live, correlated into a flow you can explore."
          />
        ) : view === 'flow' ? (
          <FlowView
            requests={filtered}
            navigations={navigations}
            totalRequests={filtered.length}
            onSelect={(id) => setSelectedId(id)}
          />
        ) : view === 'timeline' ? (
          <TimelineView requests={filtered} onSelect={(id) => setSelectedId(id)} />
        ) : (
          <RequestsView requests={filtered} onSelect={(id) => setSelectedId(id)} />
        )}

        {selected && (
          <DetailsDrawer
            record={selected}
            navigations={navigations}
            requests={requests}
            onClose={() => setSelectedId(null)}
          />
        )}
      </main>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
      <LogoMark size={34} />
      <p className="text-[13px] font-semibold">{title}</p>
      <p className="max-w-56 text-[12px] leading-relaxed text-dim">{body}</p>
    </div>
  );
}
