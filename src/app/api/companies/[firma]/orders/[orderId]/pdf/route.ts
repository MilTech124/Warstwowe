import { del, get, put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { requireCompanyMember, requireCompanyWriteIntent } from "@/server/auth";
import { Order } from "@/server/db/models";
import { apiError } from "@/server/apiError";
import { getConfiguratorBootstrap } from "@/server/services/companyService";
import { orderPdfGenerationAvailable, orderPdfUploadError } from "@/domain/orderPdf";

export const runtime = "nodejs";
export const maxDuration = 60;

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ firma: string; orderId: string }> },
) {
  try {
    const { firma, orderId } = await params;
    const access = await requireCompanyMember(firma);
    requireCompanyWriteIntent(request, access);

    const bootstrap = await getConfiguratorBootstrap(firma);
    if (!bootstrap) {
      return NextResponse.json({ error: "Firma nie istnieje." }, { status: 404 });
    }
    if (!orderPdfGenerationAvailable({
      accessActive: bootstrap.accessActive,
      capability: bootstrap.capabilities.orderPdf,
    })) {
      return NextResponse.json(
        { error: "Generowanie PDF nie jest dostępne w aktywnym pakiecie firmy." },
        { status: 403 },
      );
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        { error: "Prywatny Vercel Blob nie jest skonfigurowany." },
        { status: 503 },
      );
    }

    const order: any = await Order.findOne({
      _id: orderId,
      companyId: (access as any).company._id,
    });
    if (!order) {
      return NextResponse.json({ error: "Zamówienie nie istnieje." }, { status: 404 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: orderPdfUploadError(null) }, { status: 400 });
    }
    const uploadError = orderPdfUploadError(file);
    if (uploadError) {
      return NextResponse.json(
        { error: uploadError },
        { status: uploadError.includes("20 MB") ? 413 : 400 },
      );
    }

    const previousPath = order.pdfBlobPath as string | undefined;
    const blob = await put(
      `orders/${bootstrap.company.id}/${orderId}/${file.name}`,
      file,
      { access: "private", addRandomSuffix: true, contentType: "application/pdf" },
    );
    order.pdfBlobPath = blob.pathname;
    await order.save();

    if (previousPath && previousPath !== blob.pathname) {
      await del(previousPath).catch((error) => {
        console.error("[orderPdf] Nie udało się usunąć poprzedniego pliku PDF.", error);
      });
    }

    return NextResponse.json({ pathname: blob.pathname });
  } catch (error) {
    return apiError(error, "Nie udało się zapisać PDF.");
  }
}
