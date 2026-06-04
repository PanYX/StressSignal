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
          alignItems: "center",
          height: "100%",
          width: "100%",
          justifyContent: "center",
          background:
            "linear-gradient(130deg, rgb(15, 23, 42), rgb(30, 41, 59), rgb(15, 23, 42))",
          color: "white",
          fontFamily: "Arial",
          padding: "60px",
          fontSize: "56px",
          letterSpacing: "-0.03em",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            textAlign: "left",
            lineHeight: 1.2,
          }}
        >
          <div style={{ fontSize: "28px", opacity: 0.8, display: "flex" }}>
            StressSignal
          </div>
          <div
            style={{
              marginTop: "12px",
              fontWeight: "bold",
              display: "flex",
            }}
          >
            Market Risk Dashboard
          </div>
          <div
            style={{
              marginTop: "24px",
              fontSize: "28px",
              opacity: 0.75,
              display: "flex",
            }}
          >
            Cross-market stress overview for risk-aware investors.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
