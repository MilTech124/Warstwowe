import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireCompanyMember } from "@/server/auth";
import { Order } from "@/server/db/models";
import { apiError } from "@/server/apiError";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ firma: string; orderId: string }> },
) {
  try {
    const { firma, orderId } = await params;
    const access = await requireCompanyMember(firma);
    if ((access as any).company?.demo) {
      return NextResponse.json({ error: "Plik demonstracyjny nie został zapisany." }, { status: 404 });
    }
    const order: any = await Order.findOne({
      _id: orderId,
      companyId: (access as any).company._id,
    }).lean();
    if (!order?.pdfBlobPath) {
      return NextResponse.json({ error: "To zamówienie nie ma zapisanego PDF." }, { status: 404 });
    }
    const result = await get(order.pdfBlobPath, { access: "private" });
    if (!result || !result.stream) {
      return NextResponse.json({ error: "Plik PDF nie istnieje." }, { status: 404 });
    }
    return new NextResponse(result.stream, {
      headers: {
        "content-type": result.blob.contentType || "application/pdf",
        "content-disposition": `attachment; filename="${order.number.replaceAll("/", "-")}.pdf"`,
      },
    });
  } catch (error) {
    return apiError(error, "Nie udało się pobrać PDF.");
  }
}
