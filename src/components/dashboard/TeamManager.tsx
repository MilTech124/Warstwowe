"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/dashboard/DashboardBits";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const roleLabels: Record<string, string> = {
  OWNER: "Właściciel",
  ADMIN: "Administrator",
  SALESPERSON: "Handlowiec",
};

function memberName(membership: any) {
  const user = membership.publicUserData || {};
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") || user.identifier || "Użytkownik"
  );
}

export function TeamManager({
  slug,
  members,
  seatLimit,
}: {
  slug: string;
  members: any[];
  seatLimit: number;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("SALESPERSON");
  const [busy, setBusy] = useState(false);
  const [localMembers, setLocalMembers] = useState(members);
  const [pendingRemoval, setPendingRemoval] = useState<any>(null);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(`/api/companies/${slug}/team/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Nie udało się wysłać zaproszenia.");
      setLocalMembers((current) => [
        ...current,
        {
          id: result.invitation.id,
          status: "INVITED",
          role: result.invitation.role,
          publicUserData: { userId: null, identifier: result.invitation.email },
        },
      ]);
      setEmail("");
      toast.success(
        result.emailSent
          ? "Zaproszenie zostało wysłane."
          : "Dostęp przygotowany. Skonfiguruj SMTP, aby wysyłać zaproszenia e-mailem.",
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się wysłać zaproszenia.");
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(membership: any) {
    setBusy(true);
    try {
      const response = await fetch(`/api/companies/${slug}/team/members/${membership.id}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result.error || "Nie udało się usunąć konta.");
        return;
      }
      setLocalMembers((current) => current.filter((item) => item.id !== membership.id));
      toast.success("Dostęp do firmy został usunięty.");
      router.refresh();
    } catch {
      toast.error("Nie udało się połączyć z serwerem.");
    } finally {
      setBusy(false);
      setPendingRemoval(null);
    }
  }

  async function changeRole(membership: any, nextRole: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/companies/${slug}/team/members/${membership.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result.error || "Nie udało się zmienić roli.");
        return;
      }
      setLocalMembers((current) =>
        current.map((item) => (item.id === membership.id ? { ...item, role: nextRole } : item)),
      );
      toast.success("Rola pracownika została zmieniona.");
      router.refresh();
    } catch {
      toast.error("Nie udało się połączyć z serwerem.");
    } finally {
      setBusy(false);
    }
  }

  const seatsUsed = localMembers.length;
  const seatsExhausted = seatsUsed >= seatLimit;

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="gap-0">
          <CardHeader className="border-b [.border-b]:pb-5">
            <span className="text-[11px] font-semibold tracking-[0.13em] text-primary uppercase">
              Konta
            </span>
            <CardTitle>Członkowie zespołu</CardTitle>
            <CardDescription>Osoby z dostępem do panelu firmy.</CardDescription>
            <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
              <Badge variant={seatsExhausted ? "destructive" : "outline"}>
                {seatsUsed} / {seatLimit} miejsc
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {localMembers.length ? (
              <ul className="divide-y divide-border">
                {localMembers.map((membership: any) => {
                  const user = membership.publicUserData || {};
                  const displayName = memberName(membership);
                  return (
                    <li key={membership.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-primary/10 text-[11px] font-bold text-primary">
                          {displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="grid min-w-0 flex-1 leading-tight">
                        <span className="truncate text-sm font-medium">{displayName}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {user.identifier}
                        </span>
                      </span>

                      {membership.status === "INVITED" && (
                        <Badge variant="secondary">Oczekuje</Badge>
                      )}

                      {membership.role === "OWNER" ? (
                        <Badge variant="outline">{roleLabels.OWNER}</Badge>
                      ) : (
                        <Select
                          value={membership.role}
                          disabled={busy}
                          onValueChange={(next) => changeRole(membership, next)}
                        >
                          <SelectTrigger size="sm" aria-label={`Rola: ${displayName}`} className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SALESPERSON">{roleLabels.SALESPERSON}</SelectItem>
                            <SelectItem value="ADMIN">{roleLabels.ADMIN}</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      {membership.role !== "OWNER" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={busy}
                          aria-label={`Usuń konto ${displayName}`}
                          onClick={() => setPendingRemoval(membership)}
                          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 size={15} />
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={<Users size={26} />}
                title="Brak członków zespołu"
                description="Zaproś pierwszą osobę, aby dać jej dostęp do panelu firmy."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <form onSubmit={invite} className="contents">
            <CardHeader>
              <span
                aria-hidden="true"
                className="mb-1 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"
              >
                <UserPlus size={20} />
              </span>
              <CardTitle>Zaproś pracownika</CardTitle>
              <CardDescription>
                Dostęp zostanie przypisany do firmy po rejestracji tym adresem e-mail. Limit
                obejmuje właściciela firmy.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-email">Adres e-mail</Label>
                <div className="relative">
                  <Mail
                    size={16}
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="invite-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder="handlowiec@firma.pl"
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="invite-role">Rola</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="invite-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SALESPERSON">{roleLabels.SALESPERSON}</SelectItem>
                    <SelectItem value="ADMIN">{roleLabels.ADMIN}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {seatsExhausted && (
                <p className="text-xs text-destructive">
                  Limit miejsc w pakiecie został wyczerpany. Zwolnij miejsce lub zmień pakiet.
                </p>
              )}

              <Button type="submit" disabled={busy || seatsExhausted} className="w-full">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                Wyślij zaproszenie
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>

      <AlertDialog
        open={Boolean(pendingRemoval)}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usunąć dostęp do firmy?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRemoval
                ? `${memberName(pendingRemoval)} straci dostęp do panelu firmy. Tej operacji nie można cofnąć — trzeba będzie wysłać nowe zaproszenie.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                removeMember(pendingRemoval);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Usuń dostęp
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
