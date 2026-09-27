import { glossaryTerm } from '@webtrace/core';
import { useLearningMode } from './ThemeProvider';

/**
 * Learning Mode term — dotted underline with a glossary tooltip. When
 * Learning Mode is off, the term renders as plain text. Pass `force` in
 * contexts that are inherently educational (the Learn view).
 */
export function Term({
  termKey,
  force,
  children,
}: {
  termKey: string;
  force?: boolean;
  children?: React.ReactNode;
}) {
  const learning = useLearningMode();
  const entry = glossaryTerm(termKey);
  const label = children ?? termKey;

  if ((!learning && !force) || !entry) {
    return <span>{label}</span>;
  }

  return (
    <span className="group/term relative inline-block cursor-help border-b border-dashed border-accent/70 text-accent">
      {label}
      <span
        role="tooltip"
        className="invisible absolute bottom-full left-1/2 z-50 mb-1.5 w-64 -translate-x-1/2 rounded-lg border border-line bg-raised p-2.5 text-[11px] leading-relaxed text-ink opacity-0 shadow-xl transition-opacity duration-150 group-hover/term:visible group-hover/term:opacity-100"
      >
        <span className="mb-1 block font-semibold text-accent">{entry.title}</span>
        {entry.body}
      </span>
    </span>
  );
}
