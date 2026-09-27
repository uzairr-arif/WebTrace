/**
 * Identity helpers. Small, sortable-enough unique ids used across the event
 * stream and every record derived from it.
 */

let counter = 0;

export function uid(prefix = 'wt'): string {
  counter = (counter + 1) % 0xffff;
  let randomness = '';
  try {
    randomness = crypto.randomUUID().slice(0, 8);
  } catch {
    randomness = Math.random().toString(36).slice(2, 10);
  }
  return `${prefix}_${randomness}${counter.toString(36)}`;
}
