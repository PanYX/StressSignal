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
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(130deg, rgb(15, 23, 42), rgb(30, 41, 59), rgb(15, 23, 42))",
          color: "white",
          padding: "56px",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            lineHeight: 1.15,
          }}
        >
          <div style={{ fontSize: "34px", fontWeight: 700 }}>StressSignal</div>
          <div
            style={{
              marginTop: "16px",
              fontSize: "56px",
              fontWeight: 700,
              letterSpacing: "-0.03em",
            }}
          >
            Market Risk Dashboard
          </div>
          <div
            style={{
              marginTop: "26px",
              fontSize: "28px",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            Explainable volatility + financial stress monitoring
          </div>
          <div
            style={{
              marginTop: "30px",
              fontSize: "18px",
              color: "rgba(255,255,255,0.75)",
            }}
          >
            No investment advice. Educational reference only.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
