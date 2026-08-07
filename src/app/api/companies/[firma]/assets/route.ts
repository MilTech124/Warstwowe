import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { requireCompanyMember, requireCompanyWriteIntent } from "@/server/auth";
import { apiError } from "@/server/apiError";
import { blobImageUrl } from "@/lib/blobImage";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ firma: string }> },
) {
  try {
    const { firma } = await params;
    const access = await requireCompanyMember(firma, ["OWNER", "ADMIN"]);
    requireCompanyWriteIntent(request, access);
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "Vercel Blob nie jest skonfigurowany." }, { status: 503 });
    }
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Wybierz plik graficzny." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Logo przekracza limit 5 MB." }, { status: 413 });
    }
    const blob = await put(`companies/${(access as any).company._id}/branding/${file.name}`, file, {
      access: "private",
      addRandomSuffix: true,
      contentType: file.type,
    });
    return NextResponse.json({ url: blobImageUrl(blob.pathname) });
  } catch (error) {
    return apiError(error, "Nie udało się przesłać pliku.");
  }
}
