import { NextResponse } from "next/server";
import { z } from "zod";
import { CONSENT_RECEIPT_RETENTION_DAYS, PRIVACY_POLICY_VERSION } from "@/config/legal";
import { connectMongo } from "@/server/db/connection";
import { ConsentEvent } from "@/server/db/models";

const consentEventSchema = z.object({
  consentId: z.string().uuid(),
  action: z.enum(["ACCEPT_ALL", "REJECT_OPTIONAL", "SAVE_PREFERENCES", "REVOKE"]),
  policyVersion: z.literal(PRIVACY_POLICY_VERSION),
  preferences: z.object({
    necessary: z.literal(true),
    analytics: z.boolean(),
    marketing: z.boolean(),
  }),
  decidedAt: z.string().datetime(),
});

export async function POST(request: Request) {
  try {
    const input = consentEventSchema.parse(await request.json());
    if (!(await connectMongo())) {
      return NextResponse.json({ recorded: false }, { status: 202 });
    }
    const decidedAt = new Date(input.decidedAt);
    await ConsentEvent.create({
      consentId: input.consentId,
      action: input.action,
      policyVersion: input.policyVersion,
      analytics: input.preferences.analytics,
      marketing: input.preferences.marketing,
      decidedAt,
      expiresAt: new Date(
        decidedAt.getTime() + CONSENT_RECEIPT_RETENTION_DAYS * 86400000,
      ),
    });
    return NextResponse.json({ recorded: true }, { status: 201 });
  } catch {
    return NextResponse.json({ recorded: false }, { status: 400 });
  }
}
