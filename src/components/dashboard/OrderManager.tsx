"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, MessageSquarePlus, UserRoundCheck } from "lucide-react";
import { ORDER_STATUSES } from "@/types/saas";
import { orderStatusLabels } from "@/components/dashboard/DashboardBits";

export function OrderManager({
  slug,
  orderId,
  currentStatus,
  currentAssignee,
  team,
}: {
  slug: string;
  orderId: string;
  currentStatus: string;
  currentAssignee?: string | null;
  team: any[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [assignee, setAssignee] = useState(currentAssignee || "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/companies/${slug}/orders/${orderId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status,
          assignedClerkUserId: assignee || null,
          note: note || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || "Nie udało się zapisać zmian.");
        return;
      }
      setNote("");
      setMessage("Zmiany zapisane.");
      router.refresh();
    } catch {
      setMessage("Nie udało się połączyć z serwerem.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="dashboard-card order-manager">
      <div className="card-title">
        <div><span>Obsługa</span><h2>Status i odpowiedzialność</h2></div>
      </div>
      <label className="settings-field">
        <span>Status zamówienia</span>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          {ORDER_STATUSES.map((item) => <option key={item} value={item}>{orderStatusLabels[item]}</option>)}
        </select>
      </label>
      <label className="settings-field">
        <span><UserRoundCheck size={14} /> Przypisany handlowiec</span>
        <select value={assignee} onChange={(event) => setAssignee(event.target.value)}>
          <option value="">Nieprzypisane</option>
          {team.map((member: any) => {
            const data = member.publicUserData || {};
            const label = [data.firstName, data.lastName].filter(Boolean).join(" ") || data.identifier || member.id;
            if (!data.userId || member.status !== "ACTIVE") return null;
            return <option key={member.id} value={data.userId}>{label}</option>;
          })}
        </select>
      </label>
      <label className="settings-field">
        <span><MessageSquarePlus size={14} /> Nowa notatka</span>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={5} placeholder="Ustalenia po rozmowie z klientem…" />
      </label>
      {message && <p role="status" className={message === "Zmiany zapisane." ? "form-success" : "form-error"}>{message}</p>}
      <button className="primary-button full" type="button" disabled={busy} onClick={save}>
        {busy ? <LoaderCircle className="spin" size={15} /> : <Check size={15} />}
        Zapisz zmiany
      </button>
    </section>
  );
}
