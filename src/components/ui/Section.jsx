import { cn } from "@/lib/utils";

export function Section({ title, children, className }) {
  return (
    <section className={cn("border-b border-slate-200 px-5 py-5", className)}>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-900">{title}</h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}
