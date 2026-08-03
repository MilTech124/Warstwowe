import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const PLN = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });
const NUM = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 3 });

export function formatPln(amount: number | null | undefined) {
  return PLN.format(Number(amount) || 0);
}

export interface QuoteLine {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  unitPriceNet: number;
  totalNet: number;
}

export interface QuoteGroup {
  id: string;
  label: string;
  subtotalNet: number;
  lines: QuoteLine[];
}

export interface Quote {
  currency: string;
  priceListVersion: number | null;
  groups: QuoteGroup[];
  materialsNet: number;
  labourNet: number;
  extrasNet: number;
  deliveryNet: number;
  marginPercent: number;
  marginNet: number;
  totalNet: number;
  vatRatePercent: number;
  vatAmount: number;
  totalGross: number;
  incomplete: boolean;
  missingRates: string[];
}

/** Zestawienie kosztów — wspólne dla szczegółów zamówienia i podglądu cennika. */
export function QuoteTable({ quote, compact = false }: { quote: Quote; compact?: boolean }) {
  return (
    <div className="grid gap-4">
      {!compact && (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Pozycja</TableHead>
                <TableHead className="text-right">Ilość</TableHead>
                <TableHead>J.m.</TableHead>
                <TableHead className="text-right">Cena jedn. netto</TableHead>
                <TableHead className="text-right">Wartość netto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quote.groups.map((group) => (
                <>
                  <TableRow key={group.id} className="bg-muted/50 hover:bg-muted/50">
                    <TableCell colSpan={4} className="font-semibold">
                      {group.label}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatPln(group.subtotalNet)}
                    </TableCell>
                  </TableRow>
                  {group.lines.map((line) => (
                    <TableRow key={`${group.id}-${line.id}`}>
                      <TableCell className="pl-6">{line.label}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {NUM.format(line.quantity)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{line.unit}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPln(line.unitPriceNet)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPln(line.totalNet)}
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <dl className="grid gap-1.5 rounded-xl border border-border p-4">
        <Row label="Materiały" value={quote.materialsNet} />
        {quote.labourNet > 0 && <Row label="Robocizna" value={quote.labourNet} />}
        {quote.extrasNet > 0 && <Row label="Pozycje dodatkowe" value={quote.extrasNet} />}
        {quote.marginNet !== 0 && (
          <Row label={`Marża ${quote.marginPercent}%`} value={quote.marginNet} />
        )}
        {quote.deliveryNet > 0 && <Row label="Dostawa" value={quote.deliveryNet} />}
        <Row label="Razem netto" value={quote.totalNet} strong />
        <Row label={`VAT ${quote.vatRatePercent}%`} value={quote.vatAmount} />
        <Row label="Razem brutto" value={quote.totalGross} strong highlight />
      </dl>
    </div>
  );
}

function Row({
  label,
  value,
  strong = false,
  highlight = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4",
        strong && "border-t border-border pt-1.5",
      )}
    >
      <dt className={cn("text-sm", strong ? "font-semibold" : "text-muted-foreground")}>{label}</dt>
      <dd
        className={cn(
          "tabular-nums",
          highlight ? "text-lg font-bold text-primary" : strong ? "font-semibold" : "text-sm",
        )}
      >
        {formatPln(value)}
      </dd>
    </div>
  );
}

export function QuoteIncompleteBadge({ quote }: { quote: Quote }) {
  if (!quote.incomplete) return null;
  return (
    <Badge variant="outline" className="border-warning/35 bg-warning/10 text-warning">
      Wycena niepełna · {quote.missingRates.length} brakujących stawek
    </Badge>
  );
}
