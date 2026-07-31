import { NextResponse } from "next/server";
import { getConfiguratorBootstrap } from "@/server/services/companyService";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ firma: string }> },
) {
  const { firma } = await params;
  const bootstrap = await getConfiguratorBootstrap(firma);
  if (!bootstrap) {
    return NextResponse.json({ error: "Firma nie istnieje." }, { status: 404 });
  }
  return NextResponse.json(bootstrap, {
    headers: {
      "cache-control": "public, s-maxage=30, stale-while-revalidate=120",
    },
  });
}
