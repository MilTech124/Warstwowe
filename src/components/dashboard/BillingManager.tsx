"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PACKAGE_DEFINITIONS } from "@/domain/plans";
import type { PackageDefinition } from "@/domain/plans";
import type { PackageCode } from "@/types/saas";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function BillingManager({
  slug,
  currentPackage,
  subscriptionActive,
  cancelAtPeriodEnd = false,
  plans = Object.values(PACKAGE_DEFINITIONS),
}: {
  slug: string;
  currentPackage: PackageCode;
  subscriptionActive: boolean;
  cancelAtPeriodEnd?: boolean;
  /** Defaults to the static table; the billing page passes DB-backed plans. */
  plans?: PackageDefinition[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<PackageCode | null>(null);
  const [cancelBusy, setCancelBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    const response = await fetch(`/api/companies/${slug}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Operacja nie powiodła się.");
    return result;
  }

  async function schedule(packageCode: PackageCode) {
    setBusy(packageCode);
    try {
      const result = await patch({ action: "CHANGE_PACKAGE", packageCode });
      toast.success(result.message || "Zmiana pakietu została zaplanowana.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zaplanować zmiany.");
    } finally {
      setBusy(null);
    }
  }

  // Previously this ignored response.ok, never set a busy flag and never
  // refreshed — so the button kept showing the old state after a cancel.
  async function cancellation(action: "CANCEL" | "RESUME") {
    setCancelBusy(true);
    try {
      const result = await patch({ action });
      toast.success(
        result.message
          || (action === "CANCEL" ? "Odnowienia zostały wstrzymane." : "Odnowienia przywrócone."),
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zmienić subskrypcji.");
    } finally {
      setCancelBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <span className="text-[11px] font-semibold tracking-[0.13em] text-primary uppercase">
          Subskrypcja
        </span>
        <CardTitle>Zmień pakiet</CardTitle>
        <CardDescription>
          Zmiana zostanie zaplanowana zgodnie z bieżącym okresem rozliczeniowym.
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const current = currentPackage === plan.code;
          return (
            <article
              key={plan.code}
              className={cn(
                "flex flex-col gap-3 rounded-xl border p-4 transition-colors",
                current ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{plan.name}</h3>
                {current && (
                  <Badge className="gap-1">
                    <Check size={12} /> {subscriptionActive ? "Aktywny" : "Wybrany"}
                  </Badge>
                )}
              </div>
              <strong className="text-2xl font-bold tracking-tight tabular-nums">
                {plan.monthlyGross} zł
                <span className="ml-1 text-xs font-medium text-muted-foreground">/ mies.</span>
              </strong>
              <p className="flex-1 text-xs leading-relaxed text-muted-foreground text-pretty">
                {plan.description}
              </p>
              <Button
                variant={current ? "secondary" : "outline"}
                className="w-full"
                disabled={current || Boolean(busy)}
                onClick={() => schedule(plan.code)}
              >
                {busy === plan.code ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <>
                    Wybierz <ArrowRight size={14} />
                  </>
                )}
              </Button>
            </article>
          );
        })}
      </CardContent>

      <CardFooter className="flex-wrap justify-between gap-3 border-t pt-5">
        <span className="text-xs text-muted-foreground">
          {cancelAtPeriodEnd
            ? "Subskrypcja jest zaplanowana do zakończenia."
            : "Możesz zakończyć odnowienia bez utraty bieżącego okresu."}
        </span>
        <Button
          variant="link"
          size="sm"
          className="px-0"
          disabled={cancelBusy}
          onClick={() => cancellation(cancelAtPeriodEnd ? "RESUME" : "CANCEL")}
        >
          {cancelBusy && <Loader2 size={14} className="animate-spin" />}
          {cancelAtPeriodEnd ? "Przywróć odnowienie" : "Anuluj z końcem okresu"}
        </Button>
      </CardFooter>
    </Card>
  );
}
