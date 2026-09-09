'use client';

export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-10 rounded-lg bg-secondary/50" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-secondary/30" />
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-xl bg-card p-4 space-y-3">
          <div className="flex justify-between">
            <div className="h-4 w-24 rounded bg-secondary/50" />
            <div className="h-4 w-16 rounded bg-secondary/50" />
          </div>
          <div className="flex items-center justify-between">
            <div className="h-8 w-28 rounded bg-secondary/50" />
            <div className="h-10 w-16 rounded bg-secondary/50" />
            <div className="h-8 w-28 rounded bg-secondary/50" />
          </div>
          <div className="h-3 w-full rounded bg-secondary/30" />
        </div>
      ))}
    </div>
  );
}
