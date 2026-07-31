import { notFound, redirect } from "next/navigation";
import { SuperadminShell } from "@/components/superadmin/SuperadminShell";
import { getRequestIdentity } from "@/server/auth";
import "../superadmin-premium.css";

export const dynamic = "force-dynamic";

export default async function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const identity = await getRequestIdentity();
  if (!identity.userId) redirect("/logowanie?redirect_url=/superadmin");
  if (!identity.isSuperadmin) notFound();
  return <SuperadminShell>{children}</SuperadminShell>;
}
