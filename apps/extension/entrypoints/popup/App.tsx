import { browser } from '#imports';
import { useEffect, useState } from 'react';
import { LogoMark } from '../../components/LogoMark';
import {
  sendToBackground,
  type ActiveTabInfo,
  type TabOverview,
} from '../../lib/messages';
import { useAppSettings } from '../../components/ThemeProvider';

export function App() {
  const [overview, setOverview] = useState<TabOverview | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTabInfo | null>(null);
  const { settings, setSetting } = useAppSettings();

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      // Explicit ?tab= param (deep links / screenshots) wins over the active tab.
      const param = new URLSearchParams(window.location.search).get('tab');
      const parsed = param !== null ? Number(param) : Number.NaN;
      const tabId = Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
      if (tabId === undefined) {
        const tab = await sendToBackground<ActiveTabInfo>({ type: 'webtrace:getActiveTab' });
        if (!alive) return;
        setActiveTab(tab ?? null);
        const data = await sendToBackground<TabOverview>({
          type: 'webtrace:getTabOverview',
          tabId: tab?.id,
        });
        if (alive) setOverview(data ?? null);
        return;
      }
      const data = await sendToBackground<TabOverview>({
        type: 'webtrace:getTabOverview',
        tabId,
      });
      if (alive) setOverview(data ?? null);
    };
    void poll();
    const timer = window.setInterval(poll, 900);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const openFlow = async () => {
    const tabId = activeTab?.id ?? overview?.tabId;
    if (tabId !== undefined) {
      await sendToBackground({ type: 'webtrace:openSidePanel', tabId });
    }
    window.close();
  };

  const stats = overview?.stats;
  const apiCount = stats ? stats.byCategory.xhr : 0;

  return (
    <div className="w-[300px] bg-bg text-ink">
      {/* header */}
      <header className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2.5">
        <LogoMark />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-tight tracking-tight">WebTrace</p>
          <p className="text-[9px] leading-tight text-faint">Web Request Flow Explorer</p>
        </div>
        <span
          className={`ml-auto inline-flex items-center gap-1 rounded-full border px-1.5 py-px font-mono text-[9px] font-bold ${
            overview?.captureEnabled ? 'border-ok/40 text-ok' : 'border-faint/40 text-faint'
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${overview?.captureEnabled ? 'animate-pulse bg-ok' : 'bg-faint'}`}
          />
          {overview?.captureEnabled ? 'LIVE' : 'PAUSED'}
        </span>
      </header>

      {/* page */}
      <div className="border-b border-line px-3 py-2">
        <p className="text-[9px] uppercase tracking-wider text-faint">Current page</p>
        <p className="mt-0.5 truncate text-[12px] font-medium" title={overview?.pageTitle ?? activeTab?.title}>
          {overview?.pageTitle ?? activeTab?.title ?? '—'}
        </p>
        <p className="truncate font-mono text-[10px] text-dim" title={overview?.pageUrl ?? activeTab?.url}>
          {hostOf(overview?.pageUrl ?? activeTab?.url)}
        </p>
      </div>

      {/* stats grid */}
      <div className="grid grid-cols-4 gap-px border-b border-line bg-line">
        <Stat label="Requests" value={stats?.total ?? 0} />
        <Stat label="API" value={apiCount} accent />
        <Stat label="Errors" value={stats?.errors ?? 0} error={(stats?.errors ?? 0) > 0} />
        <Stat label="3rd" value={stats?.thirdPartyHosts.length ?? 0} />
      </div>

      {/* third-party list */}
      {stats && stats.thirdPartyHosts.length > 0 && (
        <div className="border-b border-line px-3 py-2">
          <p className="text-[9px] uppercase tracking-wider text-faint">Third-party hosts</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {stats.thirdPartyHosts.slice(0, 6).map((host) => (
              <span
                key={host}
                className="max-w-[130px] truncate rounded border border-warn/30 bg-warn/5 px-1.5 py-0.5 font-mono text-[9.5px] text-warn"
                title={host}
              >
                {host}
              </span>
            ))}
            {stats.thirdPartyHosts.length > 6 && (
              <span className="px-1 py-0.5 text-[9.5px] text-faint">
                +{stats.thirdPartyHosts.length - 6}
              </span>
            )}
          </div>
        </div>
      )}

      {/* actions */}
      <div className="flex flex-col gap-1.5 p-3">
        <button
          type="button"
          onClick={() => void openFlow()}
          className="rounded-lg bg-accent px-3 py-2 text-[12.5px] font-semibold text-on-accent transition-opacity hover:opacity-90"
        >
          Open Live Flow
        </button>
        <button
          type="button"
          onClick={() => {
            void sendToBackground({ type: 'webtrace:openDashboard' });
            window.close();
          }}
          className="rounded-lg border border-accent/40 bg-accent-soft px-3 py-1.5 text-[11.5px] font-medium text-accent transition-opacity hover:opacity-85"
        >
          Open full Dashboard ↗
        </button>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              const next = !(overview?.captureEnabled ?? settings.captureEnabled);
              setSetting('captureEnabled', next);
              void sendToBackground({ type: 'webtrace:setCapture', enabled: next });
            }}
            className="flex-1 rounded-lg border border-line px-2 py-1.5 text-[11.5px] text-dim transition-colors hover:text-ink"
          >
            {overview?.captureEnabled ? 'Pause capture' : 'Resume capture'}
          </button>
          <button
            type="button"
            onClick={() => {
              const tabId = activeTab?.id ?? overview?.tabId;
              if (tabId !== undefined) {
                void sendToBackground({ type: 'webtrace:clearSession', tabId });
              }
            }}
            className="flex-1 rounded-lg border border-line px-2 py-1.5 text-[11.5px] text-dim transition-colors hover:border-err/50 hover:text-err"
          >
            Clear session
          </button>
        </div>
        <button
          type="button"
          onClick={() => browser.runtime.openOptionsPage()}
          className="self-center pt-0.5 text-[10.5px] text-faint transition-colors hover:text-dim"
        >
          Settings & appearance →
        </button>
      </div>

      <p className="px-3 pb-2.5 text-center text-[9px] leading-relaxed text-faint">
        Everything stays on this device. No bodies are captured; sensitive headers are masked.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  error,
}: {
  label: string;
  value: number;
  accent?: boolean;
  error?: boolean;
}) {  return (
    <div className="bg-surface px-2 py-2 text-center">
      <p
        className={`font-mono text-[16px] font-semibold leading-none ${
          error ? 'text-err' : accent ? 'text-accent' : 'text-ink'
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[9px] uppercase tracking-wider text-faint">{label}</p>
    </div>
  );
}

function hostOf(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
