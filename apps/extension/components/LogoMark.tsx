/** WebTrace logo mark — three nodes, one route. */
export function LogoMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <path
        d="M5 17.5 L12 7 L19 13.5"
        stroke="var(--wt-accent)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5" cy="17.5" r="2.6" fill="var(--wt-accent)" opacity="0.55" />
      <circle cx="19" cy="13.5" r="2.6" fill="var(--wt-accent)" opacity="0.55" />
      <circle cx="12" cy="7" r="3" fill="var(--wt-accent)" />
      <circle cx="12" cy="7" r="1.3" fill="var(--wt-bg)" />
    </svg>
  );
}
