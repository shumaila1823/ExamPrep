import { Loader2 } from 'lucide-react';

export function Spinner({ size = 20, label }) {
  return (
    <span className="spinner" role="status">
      <Loader2 size={size} className="spin" aria-hidden="true" />
      <span className={label ? 'spinner__label' : 'sr-only'}>{label || 'Loading'}</span>
    </span>
  );
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="page-loader">
      <Spinner size={34} label={label} />
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%', radius = 8, className = '' }) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{ height, width, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

/** A grid of placeholder cards shown while a list is loading. */
export function CardSkeletons({ count = 3, height = 220 }) {
  return (
    <div className="card-grid" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card skeleton-card">
          <Skeleton height={height} radius={14} />
        </div>
      ))}
    </div>
  );
}
