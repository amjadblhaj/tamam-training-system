/**
 * Shared loading-placeholder rows — was independently reimplemented with
 * slightly different row counts/heights in 5 different list pages. A small
 * per-row animation delay gives a gentle stagger instead of every row
 * pulsing in lockstep.
 */
export function SkeletonRows({ count = 3, height = "h-10" }: { count?: number; height?: string }): JSX.Element {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded bg-brand-surface-3 ${height}`}
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </>
  );
}
