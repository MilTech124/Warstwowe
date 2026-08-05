import { NextRequest, NextResponse } from "next/server";
import { requireCompanyMember, requireCompanyWriteIntent } from "@/server/auth";
import { Subscription } from "@/server/db/models";
import { createStripePortalSession } from "@/server/stripe/client";
import { apiError } from "@/server/apiError";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ firma: string }> },
) {
  try {
    const { firma } = await params;
    const access: any = await requireCompanyMember(firma, ["OWNER"]);
    requireCompanyWriteIntent(request, access);
    if (access.company?.demo) {
      return NextResponse.json({ error: "Portal Stripe nie jest dostępny w trybie demo." }, { status: 400 });
    }
    const subscription: any = await Subscription.findOne({ companyId: access.company._id });
    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({ error: "Klient Stripe nie został jeszcze utworzony." }, { status: 409 });
    }
    const session = await createStripePortalSession(subscription.stripeCustomerId, firma);
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return apiError(error, "Nie udało się otworzyć portalu rozliczeniowego Stripe.");
  }
}
