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
  // A ZodError stringifies to the whole JSON issue array, which used to reach
  // the user as an unreadable blob. Surface the first issue instead.
  const issues = (error as any)?.issues;
  if (Array.isArray(issues) && issues.length) {
    const first = issues.find((issue: any) => issue?.message) || issues[0];
    const path = Array.isArray(first?.path) && first.path.length ? `${first.path.join(".")}: ` : "";
    return NextResponse.json({ error: `${path}${first?.message || fallback}` }, { status: 400 });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 400 },
  );
}
