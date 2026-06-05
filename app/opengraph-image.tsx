import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const alt = "Market Risk Dashboard";
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          height: "100%",
          width: "100%",
          background: "#f8fafc",
          color: "#0f172a",
          fontFamily: "Arial",
          padding: "54px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            border: "1px solid #cbd5e1",
            borderRadius: "32px",
            background: "white",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "42px 48px 0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
              <div
                style={{
                  alignItems: "center",
                  background: "#0f172a",
                  borderRadius: "18px",
                  display: "flex",
                  height: "70px",
                  justifyContent: "center",
                  width: "70px",
                }}
              >
                <svg width="54" height="54" viewBox="0 0 512 512" fill="none">
                  <path d="M112 290H162L193 208L242 348L291 142L337 290H400" stroke="#10B981" strokeWidth="42" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="400" cy="290" r="28" fill="#F59E0B" />
                </svg>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: "34px", fontWeight: 800 }}>StressSignal</div>
                <div style={{ color: "#64748b", fontSize: "20px", marginTop: "3px" }}>stresssignal.app</div>
              </div>
            </div>
            <div style={{ color: "#0f766e", fontSize: "22px", fontWeight: 700 }}>
              Public market risk dashboard
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "64px 48px 38px",
              lineHeight: 1.08,
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "67px",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                maxWidth: "880px",
              }}
            >
              Market Risk Dashboard
            </div>
            <div
              style={{
                color: "#475569",
                display: "flex",
                fontSize: "30px",
                lineHeight: 1.35,
                marginTop: "26px",
                maxWidth: "900px",
              }}
            >
              VIX, volatility term structure, financial stress and cross-market risk signals in one reading order.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              background: "#0f172a",
              height: "130px",
              padding: "0 48px 26px",
            }}
          >
            <svg width="100%" height="90" viewBox="0 0 980 90" fill="none">
              <path d="M0 62C70 55 105 20 168 31C227 41 248 76 309 67C373 58 390 18 453 22C522 27 540 76 610 68C679 61 689 30 754 35C831 41 856 76 980 41" stroke="#10B981" strokeWidth="8" strokeLinecap="round" />
              <path d="M0 74C100 74 167 69 250 72C333 76 421 61 505 64C602 67 685 84 768 76C851 68 910 63 980 65" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
            </svg>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
