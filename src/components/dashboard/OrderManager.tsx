"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, MessageSquarePlus, RotateCcw, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";
import { ORDER_STATUSES } from "@/types/saas";
import { orderStatusLabels } from "@/components/dashboard/DashboardBits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPln } from "@/components/dashboard/QuoteTable";

const UNASSIGNED = "__none__";

export function OrderManager({
  slug,
  orderId,
  currentStatus,
  currentAssignee,
  team,
  automaticTotalGross,
  currentManualPrice,
}: {
  slug: string;
  orderId: string;
  currentStatus: string;
  currentAssignee?: string | null;
  team: any[];
  automaticTotalGross?: number | null;
  currentManualPrice?: { totalGross: number; reason?: string | null } | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [assignee, setAssignee] = useState(currentAssignee || UNASSIGNED);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [priceGross, setPriceGross] = useState(
    String(currentManualPrice?.totalGross ?? automaticTotalGross ?? ""),
  );
  const [priceReason, setPriceReason] = useState(currentManualPrice?.reason || "");
  const [priceDirty, setPriceDirty] = useState(false);

  const assignableMembers = team.filter(
    (member: any) => member.publicUserData?.userId && member.status === "ACTIVE",
  );

  async function save() {
    const parsedGross = Number(priceGross.replace(",", "."));
    const restoresAutomaticPrice = automaticTotalGross != null
      && Math.round(parsedGross * 100) === Math.round(automaticTotalGross * 100);
    if (priceDirty && (!Number.isFinite(parsedGross) || parsedGross < 0)) {
      toast.error("Podaj prawidłową cenę brutto.");
      return;
    }
    if (priceDirty && !restoresAutomaticPrice && priceReason.trim().length < 2) {
      toast.error("Podaj powód ręcznej korekty ceny.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/companies/${slug}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status,
          assignedClerkUserId: assignee === UNASSIGNED ? null : assignee,
          note: note || undefined,
          ...(priceDirty ? {
            manualPrice: restoresAutomaticPrice
              ? null
              : { totalGross: parsedGross, reason: priceReason.trim() },
          } : {}),
        }),
      });
      const result = await response.json().catch(() => ({}));
      // Success used to be inferred from comparing the message string.
      if (!response.ok) {
        toast.error(result.error || "Nie udało się zapisać zmian.");
        return;
      }
      setNote("");
      setPriceDirty(false);
      toast.success("Zmiany zapisane.");
      router.refresh();
    } catch {
      toast.error("Nie udało się połączyć z serwerem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <span className="text-[11px] font-semibold tracking-[0.13em] text-primary uppercase">
          Obsługa
        </span>
        <CardTitle>Status i odpowiedzialność</CardTitle>
        <CardDescription>Zmiany są zapisywane w dzienniku zamówienia.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="order-status">Status zamówienia</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id="order-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((item) => (
                <SelectItem key={item} value={item}>
                  {orderStatusLabels[item]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {automaticTotalGross != null && (
          <div className="grid gap-3 rounded-xl border border-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor="order-price-gross">Cena końcowa brutto</Label>
              <Badge variant={currentManualPrice ? "default" : "secondary"}>
                {currentManualPrice ? "Korekta ręczna" : "Cena z cennika"}
              </Badge>
            </div>
            <Input
              id="order-price-gross"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={priceGross}
              onChange={(event) => {
                setPriceGross(event.target.value);
                setPriceDirty(true);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Automatyczna wycena z cennika: {formatPln(automaticTotalGross)}
            </p>
            <div className="grid gap-2">
              <Label htmlFor="order-price-reason">Powód korekty</Label>
              <Textarea
                id="order-price-reason"
                value={priceReason}
                onChange={(event) => {
                  setPriceReason(event.target.value);
                  setPriceDirty(true);
                }}
                rows={2}
                maxLength={500}
                placeholder="Np. rabat uzgodniony z klientem"
              />
            </div>
            {currentManualPrice && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPriceGross(String(automaticTotalGross));
                  setPriceReason("");
                  setPriceDirty(true);
                }}
              >
                <RotateCcw size={14} /> Przywróć cenę z cennika
              </Button>
            )}
          </div>
        )}

        <div className="grid gap-2">
          <Label htmlFor="order-assignee" className="gap-1.5">
            <UserRoundCheck size={14} /> Przypisany handlowiec
          </Label>
          <Select value={assignee} onValueChange={setAssignee}>
            <SelectTrigger id="order-assignee" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED}>Nieprzypisane</SelectItem>
              {assignableMembers.map((member: any) => {
                const data = member.publicUserData;
                const label =
                  [data.firstName, data.lastName].filter(Boolean).join(" ")
                  || data.identifier
                  || member.id;
                return (
                  <SelectItem key={member.id} value={data.userId}>
                    {label}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="order-note" className="gap-1.5">
            <MessageSquarePlus size={14} /> Nowa notatka
          </Label>
          <Textarea
            id="order-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={5}
            placeholder="Ustalenia po rozmowie z klientem…"
          />
        </div>

        <Button type="button" disabled={busy} onClick={save} className="w-full">
          {busy ? <LoaderCircle className="animate-spin" size={15} /> : <Check size={15} />}
          Zapisz zmiany
        </Button>
      </CardContent>
    </Card>
  );
}
