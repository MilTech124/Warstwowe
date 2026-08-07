import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  readPublicConfiguratorAccess,
  startPublicConfiguratorAccess,
  unlockPublicConfiguratorAccess,
} from "@/server/services/configuratorAccessService";

export const runtime = "nodejs";

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start") }),
  z.object({ action: z.literal("unlock"), code: z.string().trim().min(6).max(64) }),
]);

const responseHeaders = { "cache-control": "private, no-store" };

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ firma: string }> },
) {
  try {
    const { firma } = await params;
    return NextResponse.json(await readPublicConfiguratorAccess(request, firma), {
      headers: responseHeaders,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się sprawdzić dostępu." },
      { status: 400, headers: responseHeaders },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ firma: string }> },
) {
  try {
    const { firma } = await params;
    const input = actionSchema.parse(await request.json());
    if (input.action === "start") {
      return NextResponse.json(await startPublicConfiguratorAccess(request, firma), {
        headers: responseHeaders,
      });
    }

    const result = await unlockPublicConfiguratorAccess(request, firma, input.code);
    const response = NextResponse.json(result.state, { headers: responseHeaders });
    if (result.cookie) {
      response.cookies.set(result.cookie.name, result.cookie.value, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: result.cookie.maxAge,
      });
    }
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się zmienić dostępu." },
      { status: 400, headers: responseHeaders },
    );
  }
}
