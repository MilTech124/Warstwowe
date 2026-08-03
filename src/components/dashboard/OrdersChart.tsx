import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface MonthlyPoint {
  value: number;
  label: string;
  year: number;
}

/**
 * Hand-rolled bar chart — deliberately not Recharts, which would add ~500 kB to
 * the panel for one visualisation. Unlike the previous version it has a Y axis,
 * month labels and a real tooltip instead of a `title` attribute.
 */
export function OrdersChart({ data }: { data: MonthlyPoint[] }) {
  const max = Math.max(...data.map((point) => point.value), 1);
  // Round the axis top up to something readable (1, 2, 5, 10, 20, 50 …).
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: top / step + 1 }, (_, index) => top - index * step);

  return (
    <div className="flex gap-3">
      <div
        className="flex flex-col justify-between py-0.5 text-right text-[11px] tabular-nums text-muted-foreground"
        aria-hidden="true"
      >
        {ticks.map((tick) => (
          <span key={tick} className="leading-none">
            {tick}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div
          className="relative flex h-52 items-end gap-1.5 border-b border-border sm:gap-2.5"
          role="img"
          aria-label={`Wykres liczby zamówień: ${data.map((p) => `${p.label} ${p.value}`).join(", ")}`}
        >
          {ticks.slice(0, -1).map((tick, index) => (
            <span
              key={tick}
              aria-hidden="true"
              className="absolute inset-x-0 border-t border-dashed border-border/70"
              style={{ top: `${(index / (ticks.length - 1)) * 100}%` }}
            />
          ))}

          {data.map((point, index) => (
            <Tooltip key={`${point.year}-${point.label}-${index}`}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="group relative flex h-full min-w-0 flex-1 items-end focus-visible:outline-none"
                  aria-label={`${point.label} ${point.year}: ${point.value} zamówień`}
                >
                  <span
                    className="w-full rounded-t-md bg-primary/85 transition-colors group-hover:bg-primary group-focus-visible:bg-primary"
                    style={{ height: `${Math.max(2, (point.value / top) * 100)}%` }}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <span className="font-semibold">{point.value}</span> zamówień · {point.label}{" "}
                {point.year}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="mt-2 flex gap-1.5 sm:gap-2.5">
          {data.map((point, index) => (
            <span
              key={`${point.year}-${point.label}-${index}`}
              className="min-w-0 flex-1 text-center text-[10px] text-muted-foreground"
            >
              {point.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function niceStep(max: number) {
  for (const candidate of [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]) {
    if (max / candidate <= 4) return candidate;
  }
  return Math.ceil(max / 4);
}
