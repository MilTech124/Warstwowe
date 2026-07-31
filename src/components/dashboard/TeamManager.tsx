"use client";

import { useState } from "react";
import { Loader2, Mail, Trash2, UserPlus } from "lucide-react";

export function TeamManager({
  slug,
  members,
  seatLimit,
}: {
  slug: string;
  members: any[];
  seatLimit: number;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("org:member");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [localMembers, setLocalMembers] = useState(members);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/companies/${slug}/team/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Nie udało się wysłać zaproszenia.");
      setEmail("");
      setMessage("Zaproszenie zostało wysłane.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się wysłać zaproszenia.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(membership: any) {
    const userId = membership.publicUserData?.userId;
    if (!userId) return;
    setBusy(true);
    const response = await fetch(`/api/companies/${slug}/team/members/${userId}`, { method: "DELETE" });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.error);
    setLocalMembers((current) => current.filter((item) => item.id !== membership.id));
    setMessage("Konto zostało usunięte z organizacji.");
  }

  return (
    <div className="dashboard-two-column team-layout">
      <section className="dashboard-card table-card">
        <div className="card-title"><div><span>Konta</span><h2>Członkowie zespołu</h2><p>Osoby z dostępem do panelu firmy.</p></div><span className="seat-counter"><strong>{localMembers.length}</strong> / {seatLimit} miejsc</span></div>
        <div className="team-list">
          {localMembers.map((membership: any) => {
            const user = membership.publicUserData || {};
            const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.identifier || "Użytkownik";
            return (
              <div key={membership.id}>
                <span className="dashboard-avatar">{displayName.slice(0, 2).toUpperCase()}</span>
                <div><strong>{displayName}</strong><small>{user.identifier}</small></div>
                <span className="role-badge">{membership.role === "org:admin" ? "Administrator" : "Handlowiec"}</span>
                {user.userId && <button type="button" className="icon-button danger" aria-label={`Usuń konto ${displayName}`} title="Usuń konto" disabled={busy} onClick={() => removeMember(membership)}><Trash2 size={14} /></button>}
              </div>
            );
          })}
        </div>
      </section>
      <form className="dashboard-card invite-card" onSubmit={invite}>
        <div className="invite-icon"><UserPlus size={22} /></div>
        <h2>Zaproś pracownika</h2>
        <p>Zaproszenie Clerk zostanie wysłane na podany adres. Limit obejmuje właściciela firmy.</p>
        <label><span>Adres e-mail</span><div><Mail size={16} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="handlowiec@firma.pl" /></div></label>
        <label><span>Rola</span><select value={role} onChange={(event) => setRole(event.target.value)}><option value="org:member">Handlowiec</option><option value="org:admin">Administrator</option></select></label>
        {message && <div className="settings-message" role="status">{message}</div>}
        <button className="primary-button full" disabled={busy || localMembers.length >= seatLimit}>{busy ? <Loader2 size={16} className="spin" /> : <UserPlus size={16} />} Wyślij zaproszenie</button>
      </form>
    </div>
  );
}
