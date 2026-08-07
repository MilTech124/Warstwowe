import { NextRequest, NextResponse } from "next/server";
import { createCompanyOrder } from "@/server/services/orderService";
import { assertPublicConfiguratorAccess } from "@/server/services/configuratorAccessService";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ firma: string }> },
) {
  try {
    const { firma } = await params;
    await assertPublicConfiguratorAccess(request, firma);
    const result = await createCompanyOrder(firma, await request.json());
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się zapisać zamówienia." },
      { status: 400 },
    );
  }
}
