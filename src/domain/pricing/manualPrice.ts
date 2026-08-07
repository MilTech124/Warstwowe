export interface ManualPriceAdjustment {
  totalGross: number;
  reason?: string | null;
  updatedAt?: string | Date | null;
  updatedBy?: string | null;
}

type QuoteLike = Record<string, any> & {
  groups: Array<Record<string, any>>;
  totalNet: number;
  vatRatePercent: number;
  vatAmount: number;
  totalGross: number;
};

const fromGrosz = (value: number) => Math.round(value) / 100;

/**
 * Nakłada ręcznie uzgodnioną cenę brutto na snapshot automatycznej wyceny.
 * Oryginalny snapshot pozostaje bez zmian; korekta jest osobną pozycją, dzięki
 * czemu panel i PDF pokazują, skąd wzięła się końcowa wartość zamówienia.
 */
export function quoteWithManualPrice<T extends QuoteLike>(
  quote: T | null | undefined,
  adjustment: ManualPriceAdjustment | null | undefined,
): T | null {
  if (!quote) return null;
  const requestedGross = Number(adjustment?.totalGross);
  if (!adjustment || !Number.isFinite(requestedGross) || requestedGross < 0) return quote;

  const vatRatePercent = Number(quote.vatRatePercent) || 0;
  const targetGrossGrosz = Math.round(requestedGross * 100);
  const targetNetGrosz = Math.round((targetGrossGrosz * 100) / (100 + vatRatePercent));
  const targetVatGrosz = targetGrossGrosz - targetNetGrosz;
  const originalNetGrosz = Math.round((Number(quote.totalNet) || 0) * 100);
  const correctionNetGrosz = targetNetGrosz - originalNetGrosz;
  const correctionNet = fromGrosz(correctionNetGrosz);

  const groups = (quote.groups || []).filter((group) => group.id !== "manual_price_adjustment");
  if (correctionNetGrosz !== 0) {
    groups.push({
      id: "manual_price_adjustment",
      label: "Korekta handlowa",
      subtotalNet: correctionNet,
      lines: [{
        id: "manual_price",
        label: adjustment.reason?.trim() || "Ręcznie uzgodniona cena zamówienia",
        quantity: 1,
        unit: "kpl.",
        unitPriceNet: correctionNet,
        totalNet: correctionNet,
      }],
    });
  }

  return {
    ...quote,
    groups,
    totalNet: fromGrosz(targetNetGrosz),
    vatAmount: fromGrosz(targetVatGrosz),
    totalGross: fromGrosz(targetGrossGrosz),
    manualPriceAdjustmentNet: correctionNet,
    automaticTotalGross: Number(quote.totalGross) || 0,
    manuallyAdjusted: true,
    manualPriceReason: adjustment.reason?.trim() || null,
  };
}

export function orderTotalGross(order: { quote?: QuoteLike | null; manualPrice?: ManualPriceAdjustment | null }) {
  return quoteWithManualPrice(order.quote, order.manualPrice)?.totalGross ?? null;
}
