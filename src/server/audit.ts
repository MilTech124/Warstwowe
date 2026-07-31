import { connectMongo } from "@/server/db/connection";
import { AuditLog } from "@/server/db/models";

export async function writeAudit(input: {
  companyId?: string | unknown;
  actorClerkUserId?: string | null;
  actorType: "USER" | "SUPERADMIN" | "SYSTEM";
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
}) {
  if (!(await connectMongo())) return;
  await AuditLog.create(input);
}
