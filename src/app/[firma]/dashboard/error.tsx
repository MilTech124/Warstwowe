"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-16">
      <Alert variant="destructive">
        <AlertTitle>Nie udało się wczytać panelu</AlertTitle>
        <AlertDescription className="grid gap-4">
          <span>
            Wystąpił błąd po stronie serwera. Spróbuj ponownie — jeśli problem się powtarza,
            skontaktuj się z pomocą techniczną
            {error.digest ? ` i podaj identyfikator ${error.digest}.` : "."}
          </span>
          <Button variant="outline" size="sm" onClick={reset} className="w-fit">
            <RefreshCw size={15} /> Spróbuj ponownie
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
