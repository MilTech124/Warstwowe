import { cn } from "@/lib/utils";

export function Field({ label, value, children, className }) {
  return (
    <label className={cn("grid gap-2", className)}>
      <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>{label}</span>
        {value !== undefined && <span className="font-mono text-slate-700">{value}</span>}
      </div>
      {children}
    </label>
  );
}

export function Input(props) {
  return (
    <input
      className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      {...props}
    />
  );
}

export function Select({ children, ...props }) {
  return (
    <select
      className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      {...props}
    >
      {children}
    </select>
  );
}

export function Slider({ min, max, step = 0.1, value, onChange }) {
  return (
    <input
      className="h-2 w-full cursor-pointer accent-emerald-600"
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}
