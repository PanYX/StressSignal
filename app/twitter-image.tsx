import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const alt = "StressSignal Market Risk Dashboard";
export const contentType = "image/png";

export default async function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#ecfdf5",
          color: "#0f172a",
          padding: "50px",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div
              style={{
                alignItems: "center",
                background: "#0f172a",
                borderRadius: "18px",
                display: "flex",
                height: "72px",
                justifyContent: "center",
                width: "72px",
              }}
            >
              <svg width="54" height="54" viewBox="0 0 512 512" fill="none">
                <path d="M112 290H162L193 208L242 348L291 142L337 290H400" stroke="#10B981" strokeWidth="42" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="400" cy="290" r="28" fill="#F59E0B" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "34px", fontWeight: 800 }}>StressSignal</div>
              <div style={{ color: "#047857", fontSize: "20px", marginTop: "2px" }}>stresssignal.app</div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontSize: "62px", fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
              Volatility + financial stress monitoring
            </div>
            <div style={{ color: "#475569", fontSize: "28px", lineHeight: 1.35, marginTop: "24px", maxWidth: "860px" }}>
              Read VIX, VIX3M, STLFSI4, NFCI and cross-market signals together before calling a risk regime.
            </div>
          </div>
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: "16px",
              fontSize: "22px",
              color: "#0f766e",
            }}
          >
            <span>VIX</span>
            <span>VIX3M</span>
            <span>STLFSI4</span>
            <span>NFCI</span>
            <span>No investment advice</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
