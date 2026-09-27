import {
  applyFilter,
  RequestCorrelator,
  type NavigationRecord,
  type RequestRecord,
  type SessionStats,
} from '@webtrace/core';
import { browser } from '#imports';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LogoMark } from '../../components/LogoMark';
import { useAppSettings } from '../../components/ThemeProvider';
import { DetailsDrawer } from '../../components/views/DetailsDrawer';
import { FlowView } from '../../components/views/FlowView';
import { FilterBar, type FilterChip } from '../../components/views/FilterBar';
import { RequestsView } from '../../components/views/RequestsView';
import { TimelineView } from '../../components/views/TimelineView';
import { applyChips } from '../../components/views/shared';
import {
  sendToBackground,
  type SessionMeta,
  type StoredSessionFull,
} from '../../lib/messages';
import { useTraceSession } from '../../lib/trace-client';
import { LearnView } from './LearnView';
import { OverviewView } from './OverviewView';
import { SessionsView } from './SessionsView';
import { ThirdPartyView } from './ThirdPartyView';

type ViewKey = 'overview' | 'flow' | 'requests' | 'timeline' | 'thirdparty' | 'learn' | 'sessions';

const NAV: Array<{ key: ViewKey; label: string; icon: string }> = [
  { key: 'overview', label: 'Overview', icon: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' },
  { key: 'flow', label: 'Live Flow', icon: 'M3 6h7M3 12h18M3 18h5M10 6c5 0 3 6 11 6' },
  { key: 'requests', label: 'Requests', icon: 'M4 6h16M4 12h16M4 18h10' },
  { key: 'timeline', label: 'Timeline', icon: 'M4 5h13M4 12h8M4 19h16' },
  { key: 'thirdparty', label: 'Third-Party Map', icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18' },
  { key: 'learn', label: 'Learn', icon: 'M5 4h13a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 8h8M8 12h8' },
  { key: 'sessions', label: 'Sessions', icon: 'M4 7h16M4 7l2-3h12l2 3M4 7v12a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V7M9 11h6' },
];

export interface ReplayState {
  meta: SessionMeta;
  requests: RequestRecord[];
  navigations: NavigationRecord[];
  stats: SessionStats;
}

export function App() {
  const live = useTraceSession();
  const { settings, setSetting } = useAppSettings();
  const [view, setView] = useState<ViewKey>('overview');
  const [replay, setReplay] = useState<ReplayState | null>(null);
  const [query, setQuery] = useState('');
  const [chips, setChips] = useState<Set<FilterChip>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const openReplay = useCallback(async (id: string) => {
    const stored = await sendToBackground<StoredSessionFull>({
      type: 'webtrace:getSession',
      id,
    });
    if (!stored?.meta) return;
    const correlator = new RequestCorrelator();
    for (const event of stored.events) correlator.push(event);
    setReplay({
      meta: stored.meta,
      requests: correlator.getRequests(),
      navigations: correlator.getNavigations(),
      stats: correlator.getStats(),
    });
    setSelectedId(null);
    setView('overview');
  }, []);

  const backToLive = useCallback(() => {
    setReplay(null);
    setSelectedId(null);
  }, []);

  const requests = replay ? replay.requests : live.requests;
  const navigations = replay ? replay.navigations : live.navigations;
  const stats = replay ? replay.stats : live.stats;

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

  const pageLabel = replay
    ? replay.meta.title || replay.meta.url || 'Stored session'
    : hostOfUrl(live.requests[live.requests.length - 1]?.url) ||
      live.requests[0]?.documentHost ||
      'Listening…';

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-ink">
      {/* sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-surface">
        <div className="flex items-center gap-2 px-4 py-4">
          <LogoMark size={22} />
          <div>
            <p className="text-[13.5px] font-semibold leading-tight">WebTrace</p>
            <p className="text-[9.5px] leading-tight text-faint">Web Request Flow Explorer</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-2">
          {NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[12.5px] transition-colors ${
                view === item.key
                  ? 'bg-accent-soft font-medium text-accent'
                  : 'text-dim hover:bg-raised hover:text-ink'
              }`}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="space-y-1 border-t border-line px-4 py-3 text-[10.5px] text-faint">
          <p className="flex items-center gap-1.5">
            <span className={`size-1.5 rounded-full ${replay ? 'bg-warn' : 'animate-pulse bg-ok'}`} />
            {replay ? 'Replaying stored session' : 'Capturing locally'}
          </p>
          <button
            type="button"
            onClick={() => browser.runtime.openOptionsPage()}
            className="transition-colors hover:text-dim"
          >
            Settings & appearance →
          </button>
        </div>
      </aside>

      {/* main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold">{pageLabel}</p>
            <p className="text-[10.5px] text-faint">
              {stats.total} requests · {stats.errors} errors · {stats.thirdPartyHosts.length} third-party hosts
            </p>
          </div>
          {replay && (
            <button
              type="button"
              onClick={backToLive}
              className="rounded-lg border border-warn/50 bg-warn/10 px-2.5 py-1 text-[11.5px] font-medium text-warn"
            >
              ⏴ Back to live
            </button>
          )}
          <span
            className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${
              replay ? 'border-warn/40 text-warn' : 'border-ok/40 text-ok'
            }`}
          >
            <span className={`size-1.5 rounded-full ${replay ? 'bg-warn' : 'animate-pulse bg-ok'}`} />
            {replay ? 'REPLAY' : 'LIVE'}
          </span>
          {!replay && (
            <button
              type="button"
              onClick={live.clear}
              className="rounded-md border border-line px-2 py-1 text-[11px] text-dim transition-colors hover:border-err/50 hover:text-err"
            >
              Clear session
            </button>
          )}
          <button
            type="button"
            onClick={() => setSetting('learningMode', !settings.learningMode)}
            title="Learning Mode — glossary tooltips everywhere"
            className={`rounded-md border px-2 py-1 text-[11.5px] leading-none transition-colors ${
              settings.learningMode
                ? 'border-accent/60 bg-accent-soft text-accent'
                : 'border-line text-dim hover:text-ink'
            }`}
          >
            🧠
          </button>
        </header>

        {(view === 'flow' || view === 'requests' || view === 'timeline') && (
          <FilterBar query={query} onQuery={setQuery} chips={chips} onToggleChip={toggleChip} />
        )}

        <main className="relative min-h-0 flex-1 overflow-hidden">
          {view === 'overview' && (
            <OverviewView
              requests={requests}
              navigations={navigations}
              stats={stats}
              replaying={replay !== null}
              onOpenLearn={() => setView('learn')}
            />
          )}
          {view === 'flow' && (
            <FlowView
              requests={filtered}
              navigations={navigations}
              totalRequests={filtered.length}
              onSelect={(id) => setSelectedId(id)}
            />
          )}
          {view === 'requests' && (
            <RequestsView requests={filtered} onSelect={(id) => setSelectedId(id)} />
          )}
          {view === 'timeline' && (
            <TimelineView requests={filtered} onSelect={(id) => setSelectedId(id)} />
          )}
          {view === 'thirdparty' && <ThirdPartyView requests={requests} />}
          {view === 'learn' && <LearnView />}
          {view === 'sessions' && <SessionsView onOpen={openReplay} onDeleted={backToLive} />}

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
    </div>
  );
}

function hostOfUrl(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}
