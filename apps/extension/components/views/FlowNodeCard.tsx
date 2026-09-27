import type { Node, NodeProps } from '@xyflow/react';
import { CATEGORY_META, type RequestCategory } from '@webtrace/core';
import { StatusPill } from '../Badges';

export interface FlowCardData extends Record<string, unknown> {
  kind: 'navigation' | 'request';
  label: string;
  sublabel?: string;
  url?: string;
  category: RequestCategory | 'navigation';
  status?: number;
  isError?: boolean;
  durationMs?: number;
  thirdParty?: boolean;
  requestId?: string;
}

export type FlowCardNode = Node<FlowCardData, 'webtrace'>;

function categoryColor(category: RequestCategory | 'navigation'): string {
  return category === 'navigation'
    ? 'var(--wt-accent)'
    : `var(${CATEGORY_META[category].colorVar})`;
}

export function FlowNodeCard({ data, selected }: NodeProps<FlowCardNode>) {
  const color = categoryColor(data.category);
  const isApi = data.category === 'xhr';

  return (
    <div
      className={`w-[196px] rounded-lg border bg-surface px-2 py-1.5 shadow-md transition-shadow ${
        selected ? 'border-accent ring-1 ring-accent/50' : data.isError ? 'border-err/60' : 'border-line'
      }`}
      style={data.category === 'xhr' ? { borderColor: 'color-mix(in srgb, var(--wt-cat-xhr) 45%, transparent)' } : undefined}
    >
      <div className="flex items-center gap-1.5">
        <span className="size-2 shrink-0 rounded-full" style={{ background: color }} />
        <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-ink" title={data.url ?? data.label}>
          {data.label}
        </span>
        {data.kind === 'request' && <StatusPill status={data.status} />}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 pl-3.5 text-[9.5px] text-faint">
        {data.kind === 'navigation' ? (
          <span className="truncate">PAGE</span>
        ) : (
          <>
            {data.isError ? (
              <span className="font-semibold text-err">failed</span>
            ) : (
              <span>{CATEGORY_META[data.category as RequestCategory]?.label ?? 'Other'}</span>
            )}
            {data.durationMs !== undefined && (
              <span className="font-mono">{Math.max(1, Math.round(data.durationMs))}ms</span>
            )}
            {data.thirdParty && <span className="text-warn">3rd</span>}
            {isApi && <span className="text-accent">JS</span>}
          </>
        )}
      </div>
      {data.sublabel && (
        <div className="mt-0.5 truncate pl-3.5 text-[9px] text-faint" title={data.sublabel}>
          {data.sublabel}
        </div>
      )}
    </div>
  );
}
