import { registrableDomain, type RequestRecord } from '@webtrace/core';
import { useMemo } from 'react';
import { CATEGORY_META, type RequestCategory } from '@webtrace/core';

interface HostGroup {
  host: string;
  site: string;
  count: number;
  errors: number;
  cached: number;
  categories: Set<RequestCategory>;
  firstSeenOffsetMs?: number;
  thirdParty: boolean;
}

export function ThirdPartyView({ requests }: { requests: RequestRecord[] }) {
  const { firstParty, thirdParty } = useMemo(() => {
    const groups = new Map<string, HostGroup>();
    const sessionStart = requests.find((r) => r.startedAt !== undefined)?.startedAt;

    for (const r of requests) {
      if (!r.host || r.isPreflight) continue;
      const group =
        groups.get(r.host) ??
        ({
          host: r.host,
          site: registrableDomain(r.host),
          count: 0,
          errors: 0,
          cached: 0,
          categories: new Set<RequestCategory>(),
          thirdParty: false,
        } satisfies HostGroup);
      group.count += 1;
      if (r.error || (r.status !== undefined && r.status >= 400)) group.errors += 1;
      if (r.fromCache) group.cached += 1;
      group.categories.add(r.category);
      if (r.thirdParty) group.thirdParty = true;
      if (group.firstSeenOffsetMs === undefined && r.startedAt !== undefined && sessionStart !== undefined) {
        group.firstSeenOffsetMs = Math.max(0, r.startedAt - sessionStart);
      }
      groups.set(r.host, group);
    }

    const all = [...groups.values()].sort((a, b) => b.count - a.count);
    return {
      firstParty: all.filter((g) => !g.thirdParty),
      thirdParty: all.filter((g) => g.thirdParty),
    };
  }, [requests]);

  const totalThird = thirdParty.reduce((sum, g) => sum + g.count, 0);

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-[15px] font-semibold">Third-Party Map</h2>
        <p className="text-[11.5px] text-dim">
          {thirdParty.length} third-party host{thirdParty.length === 1 ? '' : 's'} ·{' '}
          {totalThird} of {requests.length} requests
        </p>
      </div>

      {firstParty.length > 0 && (
        <>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-faint">
            First-party — the page's own sites
          </h3>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {firstParty.map((g) => (
              <HostCard key={g.host} group={g} />
            ))}
          </div>
        </>
      )}

      <h3 className="mb-2 mt-5 text-[10px] font-semibold uppercase tracking-wider text-faint">
        Third parties — everyone else in the room
      </h3>
      {thirdParty.length > 0 ? (
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {thirdParty.map((g) => (
            <HostCard key={g.host} group={g} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-line bg-surface p-6 text-center text-[12px] text-dim">
          No third-party hosts observed. This page talked only to its own site.
        </p>
      )}

      <p className="mt-4 text-[10.5px] leading-relaxed text-faint">
        Classification is derived: WebTrace groups hosts by an approximated
        registrable domain and compares them against the page's own host. A full
        Public Suffix List is a planned upgrade.
      </p>
    </div>
  );
}

function HostCard({ group }: { group: HostGroup }) {
  return (
    <div
      className={`rounded-xl border bg-surface p-3.5 ${
        group.thirdParty ? 'border-warn/30' : 'border-line'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`size-2 rounded-full ${group.thirdParty ? 'bg-warn' : 'bg-ok'}`}
          aria-hidden="true"
        />
        <p className="min-w-0 flex-1 truncate font-mono text-[12px] font-medium" title={group.host}>
          {group.host}
        </p>
        <span className="font-mono text-[11px] text-faint">{group.count}</span>
      </div>
      <div className="mt-2 flex items-center gap-1">
        {[...group.categories].map((c) => (
          <span
            key={c}
            className="size-2 rounded-sm"
            style={{ background: `var(${CATEGORY_META[c].colorVar})` }}
            title={CATEGORY_META[c].label}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-3 text-[10.5px] text-faint">
        {group.errors > 0 && <span className="text-err">{group.errors} errors</span>}
        {group.cached > 0 && <span className="text-ok">{group.cached} cached</span>}
        {group.firstSeenOffsetMs !== undefined && (
          <span>first seen +{Math.round(group.firstSeenOffsetMs)}ms</span>
        )}
      </div>
    </div>
  );
}
