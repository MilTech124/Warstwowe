import { NextResponse } from "next/server";
import { AuthError } from "@/server/auth";

/**
 * Maps a thrown error onto an HTTP response. Authorization failures carry their
 * own status (401/403/404) and a user-facing Polish message; everything else
 * keeps the previous behaviour of a 400 with the validation message.
 */
export function apiError(error: unknown, fallback = "Operacja nie powiodła się.") {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: error.publicMessage, code: error.message },
      { status: error.status },
    );
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 400 },
  );
}
