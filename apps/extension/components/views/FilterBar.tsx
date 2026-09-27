import { CATEGORY_META, type RequestCategory } from '@webtrace/core';

export type FilterChip =
  | RequestCategory
  | 'errors'
  | 'third-party';

const CHIPS: Array<{ key: FilterChip; label: string }> = [
  { key: 'document', label: CATEGORY_META.document.label },
  { key: 'script', label: 'JS' },
  { key: 'stylesheet', label: 'CSS' },
  { key: 'image', label: 'Img' },
  { key: 'font', label: 'Font' },
  { key: 'xhr', label: 'API' },
  { key: 'websocket', label: 'WS' },
  { key: 'errors', label: 'Errors' },
  { key: 'third-party', label: '3rd' },
];

export function FilterBar({
  query,
  onQuery,
  chips,
  onToggleChip,
}: {
  query: string;
  onQuery: (q: string) => void;
  chips: Set<FilterChip>;
  onToggleChip: (chip: FilterChip) => void;
}) {
  return (
    <div className="border-b border-line bg-surface px-2 py-1.5">
      <input
        type="text"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        placeholder="Search…  status:500  type:api  third-party:true"
        spellCheck={false}
        className="w-full rounded-md border border-line bg-raised px-2 py-1 font-mono text-[11px] text-ink outline-none placeholder:text-faint focus:border-accent/70"
      />
      <div className="mt-1.5 flex flex-wrap gap-1">
        {CHIPS.map((chip) => {
          const active = chips.has(chip.key);
          const colorVar =
            chip.key === 'errors' || chip.key === 'third-party'
              ? undefined
              : `var(${CATEGORY_META[chip.key].colorVar})`;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => onToggleChip(chip.key)}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                active
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line text-dim hover:text-ink'
              }`}
              style={active && colorVar ? { borderColor: colorVar, color: colorVar } : undefined}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
