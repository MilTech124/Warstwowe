import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/server/auth";
import { apiError } from "@/server/apiError";
import { blobImageUrl } from "@/lib/blobImage";

export const runtime = "nodejs";

/**
 * Logo producenta do katalogu globalnego. Odpowiednik uploadu brandingu firmy
 * (`/api/companies/[firma]/assets`), ale katalog należy do superadmina, więc
 * i strażnik, i ścieżka w Blobie są inne.
 */
export async function POST(request: NextRequest) {
  try {
    await requireSuperadmin();
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "Vercel Blob nie jest skonfigurowany." }, { status: 503 });
    }
    const form = await request.formData();
    const file = form.get("file");
    const manufacturerKey = String(form.get("manufacturerKey") || "").trim();
    if (!(file instanceof File) || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Wybierz plik graficzny." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Logo przekracza limit 5 MB." }, { status: 413 });
    }
    if (!/^[a-z0-9_-]{2,80}$/.test(manufacturerKey)) {
      return NextResponse.json({ error: "Podaj klucz producenta." }, { status: 400 });
    }
    const blob = await put(`catalog/manufacturers/${manufacturerKey}/${file.name}`, file, {
      access: "private",
      addRandomSuffix: true,
      contentType: file.type,
    });
    return NextResponse.json({ url: blobImageUrl(blob.pathname) });
  } catch (error) {
    return apiError(error, "Nie udało się przesłać pliku.");
  }
}
