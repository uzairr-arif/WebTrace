import type { SessionMeta } from '../../lib/messages';
import { sendToBackground } from '../../lib/messages';
import { useCallback, useEffect, useState } from 'react';

export function SessionsView({
  onOpen,
  onDeleted,
}: {
  onOpen: (sessionId: string) => void;
  onDeleted: (sessionId: string) => void;
}) {
  const [sessions, setSessions] = useState<SessionMeta[] | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setBusy(true);
    const res = await sendToBackground<{ sessions: SessionMeta[] }>({
      type: 'webtrace:listSessions',
    });
    setSessions(res?.sessions ?? []);
    setBusy(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = async (id: string) => {
    await sendToBackground({ type: 'webtrace:deleteSession', id });
    onDeleted(id);
    void refresh();
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-semibold">Stored sessions</h2>
          <p className="text-[11.5px] text-dim">
            Captured locally in this browser's IndexedDB — never uploaded anywhere.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={busy}
          className="rounded-lg border border-line px-3 py-1.5 text-[11.5px] text-dim transition-colors hover:text-ink disabled:opacity-50"
        >
          ↻ Refresh
        </button>
      </div>

      {sessions === null ? (
        <p className="p-6 text-center text-[12px] text-faint">Loading…</p>
      ) : sessions.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface p-6 text-center text-[12px] text-dim">
          No stored sessions yet. Browse a website with capture running, and it
          will appear here.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          {sessions.map((s, i) => {
            const date = new Date(s.updatedAt);
            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 px-4 py-2.5 ${
                  i > 0 ? 'border-t border-line/60' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium" title={s.title ?? s.url}>
                    {s.title || hostOf(s.url) || `Tab ${s.tabId}`}
                  </p>
                  <p className="truncate font-mono text-[10.5px] text-faint" title={s.url}>
                    {hostOf(s.url) || 'unknown host'} · {date.toLocaleString()} ·{' '}
                    {s.eventCount} events
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpen(s.id)}
                  className="rounded-lg border border-accent/50 bg-accent-soft px-3 py-1.5 text-[11.5px] font-medium text-accent"
                >
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => void remove(s.id)}
                  className="rounded-lg border border-line px-3 py-1.5 text-[11.5px] text-dim transition-colors hover:border-err/50 hover:text-err"
                >
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function hostOf(url: string | undefined): string {
  if (!url) return '';
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}
