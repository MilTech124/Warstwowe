import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { z } from "zod";
import { requireCompanyMember, requireCompanyWriteIntent } from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { CompanyMembership, Order, OrderEvent } from "@/server/db/models";
import { ORDER_STATUSES } from "@/types/saas";
import { apiError } from "@/server/apiError";
import { demoModeEnabled } from "@/server/services/companyService";
import { updateDemoOrder } from "@/server/demoOrders";

const updateOrderSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  note: z.string().trim().max(4000).optional(),
  assignedClerkUserId: z.string().trim().max(200).nullable().optional(),
  manualPrice: z.object({
    totalGross: z.number().finite().min(0).max(100_000_000),
    reason: z.string().trim().min(2).max(500),
  }).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ firma: string; orderId: string }> },
) {
  try {
    const { firma, orderId } = await params;
    const input = updateOrderSchema.parse(await request.json());

    if (firma === "demo" && demoModeEnabled()) {
      const updated = updateDemoOrder(orderId, input);
      if (!updated) {
        return NextResponse.json({ error: "Zamówienie nie istnieje." }, { status: 404 });
      }
      return NextResponse.json({ order: updated, demo: true });
    }

    const access = await requireCompanyMember(firma);
    requireCompanyWriteIntent(request, access);

    const companyId = (access as any).company._id;
    const before = await Order.findOne({ _id: orderId, companyId }).lean();
    if (!before) {
      return NextResponse.json({ error: "Zamówienie nie istnieje." }, { status: 404 });
    }
    if (input.manualPrice && !(before as any).quote) {
      return NextResponse.json(
        { error: "Zamówienie nie ma automatycznej wyceny, którą można skorygować." },
        { status: 409 },
      );
    }

    const patch: Record<string, unknown> = {};
    if (input.status) patch.status = input.status;
    if (input.assignedClerkUserId !== undefined) {
      if (input.assignedClerkUserId) {
        const assigneeExists = input.assignedClerkUserId === (access as any).company.ownerClerkUserId
          || await CompanyMembership.exists({
            companyId,
            clerkUserId: input.assignedClerkUserId,
            status: "ACTIVE",
          });
        if (!assigneeExists) throw new Error("Wybrany pracownik nie ma aktywnego dostępu do tej firmy.");
      }
      patch.assignedClerkUserId = input.assignedClerkUserId || null;
    }
    if (input.note) patch.notes = [String((before as any).notes || ""), input.note].filter(Boolean).join("\n\n");
    if (input.manualPrice !== undefined) {
      patch.manualPrice = input.manualPrice ? {
        totalGross: input.manualPrice.totalGross,
        reason: input.manualPrice.reason,
        updatedAt: new Date(),
        updatedBy: access.userId,
      } : null;
      // Dokument zawiera cenę, więc po korekcie poprzedni PDF nie może pozostać
      // dostępny jako aktualna oferta.
      if ((before as any).pdfBlobPath) patch.pdfBlobPath = null;
    }

    const updated = await Order.findOneAndUpdate(
      { _id: orderId, companyId },
      { $set: patch },
      { new: true },
    ).lean();

    if (input.manualPrice !== undefined && (before as any).pdfBlobPath && process.env.BLOB_READ_WRITE_TOKEN) {
      await del((before as any).pdfBlobPath).catch((error) => {
        console.error("[order] Nie udało się usunąć nieaktualnego PDF po zmianie ceny.", error);
      });
    }

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
    if (input.manualPrice !== undefined) {
      events.push({
        companyId,
        orderId,
        type: input.manualPrice ? "PRICE_ADJUSTED" : "PRICE_RESTORED",
        actorClerkUserId: access.userId,
        note: input.manualPrice?.reason,
        metadata: {
          automaticTotalGross: Number((before as any).quote?.totalGross) || null,
          previousTotalGross: Number((before as any).manualPrice?.totalGross) || null,
          totalGross: input.manualPrice?.totalGross ?? null,
        },
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
    return apiError(error, "Nie udało się zmienić zamówienia.");
  }
}
