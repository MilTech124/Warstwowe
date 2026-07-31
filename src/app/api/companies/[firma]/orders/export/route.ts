import { NextResponse } from "next/server";
import { getCompanyOrders } from "@/server/services/dashboardService";
import { getConfiguratorBootstrap } from "@/server/services/companyService";

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
    const orders = await getCompanyOrders(firma);
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się wyeksportować zamówień." },
      { status: 400 },
    );
  }
}
