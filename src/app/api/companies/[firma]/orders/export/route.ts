import { NextResponse } from "next/server";
import { getCompanyOrders } from "@/server/services/dashboardService";
import { getConfiguratorBootstrap } from "@/server/services/companyService";
import { apiError } from "@/server/apiError";

function csvCell(value: unknown) {
  const text = String(value ?? "").replaceAll('"', '""');
  return `"${text}"`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ firma: string }> },
) {
  try {
    const { firma } = await params;
    const bootstrap = await getConfiguratorBootstrap(firma);
    if (!bootstrap?.capabilities.csvExport) {
      return NextResponse.json({ error: "Eksport CSV nie jest dostępny w tym pakiecie." }, { status: 403 });
    }
    // The export is a full dump, so it deliberately bypasses page-sized reads.
    const { rows: orders } = await getCompanyOrders(firma, { all: true });
    const rows = [
      ["Numer", "Status", "Klient", "E-mail", "Telefon", "Data"],
      ...orders.map((order: any) => [
        order.number,
        order.status,
        order.customer?.name,
        order.customer?.email,
        order.customer?.phone,
        new Date(order.submittedAt).toISOString(),
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${firma}-zamowienia.csv"`,
      },
    });
  } catch (error) {
    return apiError(error, "Nie udało się wyeksportować zamówień.");
  }
}
