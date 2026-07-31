import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCompanyMember, requireCompanyWriteIntent } from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { Order, OrderEvent } from "@/server/db/models";
import { ORDER_STATUSES } from "@/types/saas";

const updateOrderSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  note: z.string().trim().max(4000).optional(),
  assignedClerkUserId: z.string().trim().max(200).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ firma: string; orderId: string }> },
) {
  try {
    const { firma, orderId } = await params;
    const access = await requireCompanyMember(firma);
    requireCompanyWriteIntent(request, access);
    const input = updateOrderSchema.parse(await request.json());
    if ((access as any).company?.demo) {
      return NextResponse.json({ ok: true, demo: true });
    }

    const companyId = (access as any).company._id;
    const before = await Order.findOne({ _id: orderId, companyId }).lean();
    if (!before) {
      return NextResponse.json({ error: "Zamówienie nie istnieje." }, { status: 404 });
    }

    const patch: Record<string, unknown> = {};
    if (input.status) patch.status = input.status;
    if (input.assignedClerkUserId !== undefined) {
      patch.assignedClerkUserId = input.assignedClerkUserId || null;
    }
    if (input.note) patch.notes = [String((before as any).notes || ""), input.note].filter(Boolean).join("\n\n");

    const updated = await Order.findOneAndUpdate(
      { _id: orderId, companyId },
      { $set: patch },
      { new: true },
    ).lean();

    const events = [];
    if (input.status && input.status !== (before as any).status) {
      events.push({
        companyId,
        orderId,
        type: "STATUS_CHANGED",
        actorClerkUserId: access.userId,
        fromStatus: (before as any).status,
        toStatus: input.status,
      });
    }
    if (input.note) {
      events.push({
        companyId,
        orderId,
        type: "NOTE_ADDED",
        actorClerkUserId: access.userId,
        note: input.note,
      });
    }
    if (input.assignedClerkUserId !== undefined) {
      events.push({
        companyId,
        orderId,
        type: "ASSIGNEE_CHANGED",
        actorClerkUserId: access.userId,
        metadata: { assignedClerkUserId: input.assignedClerkUserId },
      });
    }
    if (events.length) await OrderEvent.insertMany(events);

    await writeAudit({
      companyId,
      actorClerkUserId: access.userId,
      actorType: (access as any).isSuperadmin ? "SUPERADMIN" : "USER",
      action: "order.updated",
      entityType: "Order",
      entityId: orderId,
      before,
      after: updated,
    });
    return NextResponse.json({ order: updated });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się zmienić zamówienia." },
      { status: 400 },
    );
  }
}
