import { computeWaterfall, type RequestRecord, type WaterfallPhaseKind } from '@webtrace/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StatusPill } from '../Badges';
import { isFailed } from './shared';

const PHASE_COLORS: Record<WaterfallPhaseKind, string> = {
  queued: 'var(--wt-faint)',
  wait: 'var(--wt-accent)',
  download: 'var(--wt-ok)',
};

const SPEEDS = [1, 2, 4] as const;

export function TimelineView({
  requests,
  onSelect,
}: {
  requests: RequestRecord[];
  onSelect: (requestId: string) => void;
}) {
  const rows = useMemo(() => {
    const completed = requests.filter((r) => r.startedAt !== undefined);
    if (completed.length === 0) return null;
    const withWf = completed.map((r) => ({ record: r, wf: computeWaterfall(r) }));
    const t0 = Math.min(...withWf.map((x) => x.record.startedAt ?? 0));
    const t1 = Math.max(
      ...withWf.map((x) => (x.record.completedAt ?? x.record.failedAt ?? x.record.startedAt ?? 0)),
    );
    const total = Math.max(1, t1 - t0);
    return { rows: withWf, t0, total };
  }, [requests]);

  /* replay cursor */
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(2);
  const [progress, setProgress] = useState(0);
  const raf = useRef<number | undefined>(undefined);
  const lastTick = useRef<number>(0);

  useEffect(() => {
    if (!playing || !rows) return;
    lastTick.current = performance.now();
    const step = (now: number) => {
      const dt = now - lastTick.current;
      lastTick.current = now;
      setProgress((p) => {
        const next = p + (dt * speed) / rows.total;
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current !== undefined) cancelAnimationFrame(raf.current);
    };
  }, [playing, speed, rows]);

  if (!rows) {
    return <div className="p-6 text-center text-[12px] text-dim">Nothing to place on the timeline yet.</div>;
  }

  const cursorX = progress * 100;

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-line bg-surface px-2 py-1.5">
        <button
          type="button"
          onClick={() => {
            if (playing) {
              setPlaying(false);
            } else {
              if (progress >= 1) setProgress(0);
              setPlaying(true);
            }
          }}
          className="rounded-md border border-accent/50 bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent"
        >
          {playing ? '❚❚ Pause' : '▶ Replay'}
        </button>
        <div className="flex overflow-hidden rounded-md border border-line">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={`px-1.5 py-0.5 font-mono text-[10px] ${
                speed === s ? 'bg-accent-soft text-accent' : 'text-dim hover:text-ink'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
        <span className="ml-auto font-mono text-[10px] text-faint">
          {rows.total < 1000 ? `${Math.round(rows.total)}ms` : `${(rows.total / 1000).toFixed(2)}s`} total
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {rows.rows.map(({ record, wf }) => {
          return (
            <button
              key={record.id}
              type="button"
              onClick={() => onSelect(record.id)}
              className={`block w-full px-2 py-1 text-left transition-colors hover:bg-raised ${
                isFailed(record) ? 'bg-err/5' : ''
              }`}
            >
              <div className="flex items-center gap-1.5">
                <StatusPill status={record.status} error={record.error} />
                <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-ink" title={record.url}>
                  {record.path}
                </span>
                <span className="font-mono text-[9.5px] text-faint">
                  {record.durationMs !== undefined ? `${Math.max(1, Math.round(record.durationMs))}ms` : '…'}
                </span>
              </div>
              <div className="relative mt-0.5 h-2.5 w-full overflow-hidden rounded-sm bg-raised">
                {wf.phases.map((phase, i) => {
                  const left = ((record.startedAt ?? 0) + phase.startMs - rows.t0) / rows.total;
                  const width = (phase.endMs - phase.startMs) / rows.total;
                  if (width <= 0) return null;
                  return (
                    <span
                      key={i}
                      className="absolute top-0 h-full"
                      style={{
                        left: `${left * 100}%`,
                        width: `${Math.max(width * 100, 0.4)}%`,
                        background: PHASE_COLORS[phase.kind],
                        opacity: phase.kind === 'queued' ? 0.45 : 0.85,
                      }}
                    />
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>

      {playing && (
        <div
          className="pointer-events-none absolute bottom-0 top-0 w-px bg-accent/80"
          style={{ left: `${cursorX}%` }}
        />
      )}

      <div className="flex items-center gap-3 border-t border-line bg-surface px-2 py-1 text-[9px] text-faint">
        <span className="flex items-center gap-1"><i className="inline-block size-2 rounded-sm" style={{ background: PHASE_COLORS.queued }} />queued</span>
        <span className="flex items-center gap-1"><i className="inline-block size-2 rounded-sm" style={{ background: PHASE_COLORS.wait }} />waiting for server</span>
        <span className="flex items-center gap-1"><i className="inline-block size-2 rounded-sm" style={{ background: PHASE_COLORS.download }} />downloading</span>
      </div>
    </div>
  );
}
