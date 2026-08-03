import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeletons mirror the box model of the real layout (same heights, same grid)
 * so switching from placeholder to content does not shift anything.
 */

export function PageHeadingSkeleton({ withActions = true }: { withActions?: boolean }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="grid gap-2.5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      {withActions && (
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32" />
        </div>
      )}
    </div>
  );
}

export function MetricGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} className="gap-0 py-5">
          <CardContent className="grid gap-3 px-5">
            <div className="flex items-start justify-between">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="size-9 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CardSkeleton({ lines = 4, height }: { lines?: number; height?: string }) {
  return (
    <Card>
      <CardHeader className="gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent className="grid gap-3" style={height ? { minHeight: height } : undefined}>
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <Card className="overflow-hidden py-0">
      <div className="grid gap-px bg-border">
        <div
          className="grid gap-4 bg-muted/60 px-4 py-3"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cols }, (_, index) => (
            <Skeleton key={index} className="h-3 w-20" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-4 bg-card px-4 py-4"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols }, (_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 w-full max-w-28" />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
