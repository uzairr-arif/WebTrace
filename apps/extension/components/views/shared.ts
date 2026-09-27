import type { RequestRecord } from '@webtrace/core';
import type { FilterChip } from './FilterBar';

export function isFailed(r: RequestRecord): boolean {
  return r.error !== undefined || (r.status !== undefined && r.status >= 400);
}

/** OR-combine the active chips (a request matching any chip stays visible). */
export function applyChips(list: RequestRecord[], chips: Set<FilterChip>): RequestRecord[] {
  if (chips.size === 0) return list;
  return list.filter((r) => {
    for (const chip of chips) {
      if (chip === 'errors' && isFailed(r)) return true;
      if (chip === 'third-party' && r.thirdParty) return true;
      if (chip !== 'errors' && chip !== 'third-party' && r.category === chip) return true;
    }
    return false;
  });
}
