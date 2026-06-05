import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#0f172a",
          borderRadius: "40px",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <svg width="142" height="142" viewBox="0 0 512 512" fill="none">
          <path d="M112 290H162L193 208L242 348L291 142L337 290H400" stroke="#10B981" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="400" cy="290" r="28" fill="#F59E0B" />
          <path d="M112 366H400" stroke="#E2E8F0" strokeWidth="26" strokeLinecap="round" opacity="0.85" />
        </svg>
      </div>
    ),
    size,
  );
}
