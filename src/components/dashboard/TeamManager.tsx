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
  const [role, setRole] = useState("SALESPERSON");
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
      setLocalMembers((current) => [...current, {
        id: result.invitation.id,
        status: "INVITED",
        role: result.invitation.role,
        publicUserData: { userId: null, identifier: result.invitation.email },
      }]);
      setEmail("");
      setMessage(result.emailSent
        ? "Zaproszenie zostało wysłane."
        : "Dostęp został przygotowany. Skonfiguruj SMTP, aby wysyłać zaproszenia e-mailem.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się wysłać zaproszenia.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(membership: any) {
    setBusy(true);
    const response = await fetch(`/api/companies/${slug}/team/members/${membership.id}`, { method: "DELETE" });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.error);
    setLocalMembers((current) => current.filter((item) => item.id !== membership.id));
    setMessage("Dostęp do firmy został usunięty.");
  }

  async function changeRole(membership: any, nextRole: string) {
    setBusy(true);
    setMessage(null);
    const response = await fetch(`/api/companies/${slug}/team/members/${membership.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.error || "Nie udało się zmienić roli.");
    setLocalMembers((current) => current.map((item) =>
      item.id === membership.id ? { ...item, role: nextRole } : item));
    setMessage("Rola pracownika została zmieniona.");
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
                {membership.role === "OWNER" ? (
                  <span className="role-badge">Właściciel</span>
                ) : (
                  <select
                    className="role-badge"
                    aria-label={`Rola ${displayName}`}
                    value={membership.role}
                    disabled={busy}
                    onChange={(event) => changeRole(membership, event.target.value)}
                  >
                    <option value="SALESPERSON">Handlowiec</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                )}
                {membership.status === "INVITED" && <span className="role-badge">Oczekuje</span>}
                {membership.role !== "OWNER" && <button type="button" className="icon-button danger" aria-label={`Usuń konto ${displayName}`} title="Usuń konto" disabled={busy} onClick={() => removeMember(membership)}><Trash2 size={14} /></button>}
              </div>
            );
          })}
        </div>
      </section>
      <form className="dashboard-card invite-card" onSubmit={invite}>
        <div className="invite-icon"><UserPlus size={22} /></div>
        <h2>Zaproś pracownika</h2>
        <p>Dostęp zostanie przypisany do firmy po rejestracji tym adresem e-mail. Limit obejmuje właściciela firmy.</p>
        <label><span>Adres e-mail</span><div><Mail size={16} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="handlowiec@firma.pl" /></div></label>
        <label><span>Rola</span><select value={role} onChange={(event) => setRole(event.target.value)}><option value="SALESPERSON">Handlowiec</option><option value="ADMIN">Administrator</option></select></label>
        {message && <div className="settings-message" role="status">{message}</div>}
        <button className="primary-button full" disabled={busy || localMembers.length >= seatLimit}>{busy ? <Loader2 size={16} className="spin" /> : <UserPlus size={16} />} Wyślij zaproszenie</button>
      </form>
    </div>
  );
}
