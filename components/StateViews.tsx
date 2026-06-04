export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="skeleton-wrap" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div className="skeleton-row" key={index} />
      ))}
    </div>
  );
}

export function ErrorState({ label, onRetry }: { label: string; onRetry: () => void }) {
  return (
    <button className="state-box" type="button" onClick={onRetry}>
      Couldn't load {label} - tap to retry
    </button>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="state-box muted">{children}</div>;
}
