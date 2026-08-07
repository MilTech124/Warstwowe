import { ImageResponse } from "next/og";

export const alt = "Warstwowe3D — konfigurator 3D hal i garaży z płyty warstwowej";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Generowany serwerowo, żeby nie trzymać w repo pliku, który rozjedzie się
// z treścią strony przy pierwszej zmianie nagłówka.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#0a0c0d",
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 85% 10%, rgba(61,220,151,0.20), transparent 60%)",
          color: "#f2f5f4",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: 12,
              background: "#3ddc97",
              color: "#04120c",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            W3
          </div>
          <div style={{ fontSize: 30, fontWeight: 700 }}>Warstwowe3D</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 40, color: "#3ddc97", fontWeight: 600 }}>
            Dla firm, które budują hale i garaże z płyty warstwowej
          </div>
          {/* Satori nie renderuje <br/> — każda linia musi być osobnym węzłem
              w kontenerze z jawnym display, inaczej build się wywala. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 68,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
            }}
          >
            <div style={{ display: "flex" }}>Twój konfigurator.</div>
            <div style={{ display: "flex" }}>Twoja marka. Twój cennik.</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 40, fontSize: 24, color: "#b4beba" }}>
          <div style={{ display: "flex" }}>Konstrukcja wg strefy śniegowej</div>
          <div style={{ display: "flex" }}>Zestawienie materiałów</div>
          <div style={{ display: "flex" }}>Oferta PDF z rysunkami</div>
        </div>
      </div>
    ),
    size,
  );
}
