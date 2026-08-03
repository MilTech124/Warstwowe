"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Keeps the current filters while moving between pages. */
export function Pagination({ page, pageCount }: { page: number; pageCount: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function goTo(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete("page");
    else params.set("page", String(next));
    startTransition(() => router.push(`?${params.toString()}`));
  }

  return (
    <nav className="flex items-center gap-1.5" aria-label="Stronicowanie">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1 || pending}
        onClick={() => goTo(page - 1)}
      >
        <ChevronLeft size={15} /> Poprzednia
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= pageCount || pending}
        onClick={() => goTo(page + 1)}
      >
        Następna <ChevronRight size={15} />
      </Button>
    </nav>
  );
}
