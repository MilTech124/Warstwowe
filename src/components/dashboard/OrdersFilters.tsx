"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Filter bar for the orders table. The previous version was a plain GET form,
 * so every filter change was a full page reload with no pending feedback.
 */
export function OrdersFilters({
  defaultSearch,
  defaultStatus,
  statuses,
}: {
  defaultSearch?: string;
  defaultStatus: string;
  statuses: Record<string, string>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function apply(next: { search?: string; status?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "ALL") params.delete(key);
      else params.set(key, value);
    }
    // Any filter change invalidates the current page offset.
    params.delete("page");
    startTransition(() => router.push(`?${params.toString()}`));
  }

  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        apply({ search: String(data.get("search") ?? "") });
      }}
    >
      <div className="relative flex-1">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          name="search"
          defaultValue={defaultSearch}
          aria-label="Szukaj zamówienia"
          placeholder="Numer, klient lub e-mail…"
          className="pl-9"
        />
      </div>

      <Select defaultValue={defaultStatus} onValueChange={(status) => apply({ status })}>
        <SelectTrigger className="sm:w-52" aria-label="Status zamówienia">
          <SelectValue placeholder="Wszystkie statusy" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Wszystkie statusy</SelectItem>
          {Object.entries(statuses).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
        Filtruj
      </Button>
    </form>
  );
}
