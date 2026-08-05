"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ExternalLink, Loader2 } from "lucide-react";
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
  allowCurrentCheckout = false,
  packageChangesDisabled = false,
  plans = Object.values(PACKAGE_DEFINITIONS),
}: {
  slug: string;
  currentPackage: PackageCode;
  subscriptionActive: boolean;
  allowCurrentCheckout?: boolean;
  packageChangesDisabled?: boolean;
  plans?: PackageDefinition[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<PackageCode | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);

  async function schedule(packageCode: PackageCode) {
    setBusy(packageCode);
    try {
      const response = await fetch(`/api/companies/${slug}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CHANGE_PACKAGE", packageCode }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Operacja nie powiodła się.");
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      toast.success(result.message || "Zmiana pakietu została zaplanowana.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zaplanować zmiany.");
    } finally {
      setBusy(null);
    }
  }

  async function openPortal() {
    setPortalBusy(true);
    try {
      const response = await fetch(`/api/companies/${slug}/billing-portal`, { method: "POST" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) {
        throw new Error(result.error || "Nie udało się otworzyć portalu Stripe.");
      }
      window.location.assign(result.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się otworzyć portalu Stripe.");
    } finally {
      setPortalBusy(false);
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
                disabled={packageChangesDisabled || (current && !allowCurrentCheckout) || Boolean(busy)}
                onClick={() => schedule(plan.code)}
              >
                {busy === plan.code ? <Loader2 size={15} className="animate-spin" /> : (
                  <>{current && allowCurrentCheckout ? "Dokończ płatność" : "Wybierz"} <ArrowRight size={14} /></>
                )}
              </Button>
            </article>
          );
        })}
      </CardContent>

      <CardFooter className="flex-wrap justify-between gap-3 border-t pt-5">
        <span className="text-xs text-muted-foreground">
          Faktury, dane firmy, metoda płatności i anulowanie są dostępne w portalu Stripe.
        </span>
        <Button variant="link" size="sm" className="px-0" disabled={portalBusy} onClick={openPortal}>
          {portalBusy ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
          Zarządzaj w Stripe
        </Button>
      </CardFooter>
    </Card>
  );
}
