"use client";

/**
 * Root error boundary — replaces the raw Next.js error screen. It must render
 * its own <html>/<body> because it substitutes the root layout.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeContent: "center",
          gap: "12px",
          padding: "24px",
          textAlign: "center",
          background: "#f3f5f4",
          color: "#15221f",
          fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.75rem", letterSpacing: "-0.02em" }}>
          Coś poszło nie tak
        </h1>
        <p style={{ margin: 0, maxWidth: "34rem", color: "#64736f", lineHeight: 1.6 }}>
          Aplikacja napotkała nieoczekiwany błąd.
          {error.digest ? ` Identyfikator zgłoszenia: ${error.digest}.` : ""}
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            justifySelf: "center",
            marginTop: "8px",
            padding: "10px 18px",
            border: 0,
            borderRadius: "10px",
            background: "#087f72",
            color: "#fff",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Spróbuj ponownie
        </button>
      </body>
    </html>
  );
}
