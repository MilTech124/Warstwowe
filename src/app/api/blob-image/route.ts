import { get } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { isAllowedBlobImagePath } from "@/lib/blobImage";
import { apiError } from "@/server/apiError";

export const runtime = "nodejs";

/**
 * Publiczny odczyt wyłącznie plików brandingowych. Sam Blob Store pozostaje
 * prywatny, więc inne obiekty (np. PDF-y zamówień) nie są dostępne tą trasą.
 */
export async function GET(request: NextRequest) {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: "Vercel Blob nie jest skonfigurowany." }, { status: 503 });
    }

    const pathname = request.nextUrl.searchParams.get("pathname") || "";
    if (!isAllowedBlobImagePath(pathname)) {
      return NextResponse.json({ error: "Nieprawidłowa ścieżka obrazu." }, { status: 400 });
    }

    const result = await get(pathname, {
      access: "private",
      ifNoneMatch: request.headers.get("if-none-match") || undefined,
    });
    if (!result) {
      return NextResponse.json({ error: "Obraz nie istnieje." }, { status: 404 });
    }
    if (result.statusCode === 304) {
      return new NextResponse(null, { status: 304, headers: { etag: result.blob.etag } });
    }
    if (!result.blob.contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Plik nie jest obrazem." }, { status: 415 });
    }

    return new NextResponse(result.stream, {
      headers: {
        "content-type": result.blob.contentType,
        "content-length": String(result.blob.size),
        "cache-control": "public, max-age=31536000, immutable",
        "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
        etag: result.blob.etag,
        "x-content-type-options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error, "Nie udało się pobrać obrazu.");
  }
}
