import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/server/db/connection";
import { Order } from "@/server/db/models";
import { getConfiguratorBootstrap } from "@/server/services/companyService";
import { verifyOrderReceiptToken } from "@/server/services/orderService";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ firma: string; orderId: string }> },
) {
  try {
    const { firma, orderId } = await params;
    const bootstrap = await getConfiguratorBootstrap(firma);
    if (!bootstrap?.accessActive || !bootstrap.capabilities.orderPdf) {
      return NextResponse.json({ error: "PDF jest dostępny tylko w aktywnym pakiecie Diamond." }, { status: 403 });
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN || !(await connectMongo())) {
      return NextResponse.json({ error: "Prywatny Vercel Blob nie jest skonfigurowany." }, { status: 503 });
    }
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
    const order: any = await Order.findOne({
      _id: orderId,
      companyId: bootstrap.company.id,
    }).select("+publicTokenHash");
    if (!order || !token || !verifyOrderReceiptToken(token, order.publicTokenHash)) {
      return NextResponse.json({ error: "Nieprawidłowy token zamówienia." }, { status: 401 });
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.type !== "application/pdf") {
      return NextResponse.json({ error: "Oczekiwano pliku PDF." }, { status: 400 });
    }
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "PDF przekracza limit 20 MB." }, { status: 413 });
    }
    const blob = await put(
      `orders/${bootstrap.company.id}/${orderId}/${file.name}`,
      file,
      { access: "private", addRandomSuffix: true, contentType: "application/pdf" },
    );
    order.pdfBlobPath = blob.pathname;
    await order.save();
    return NextResponse.json({ pathname: blob.pathname });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się zapisać PDF." },
      { status: 400 },
    );
  }
}
