import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#0f172a",
          borderRadius: "8px",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <svg width="26" height="26" viewBox="0 0 512 512" fill="none">
          <path d="M112 290H162L193 208L242 348L291 142L337 290H400" stroke="#10B981" strokeWidth="46" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="400" cy="290" r="30" fill="#F59E0B" />
        </svg>
      </div>
    ),
    size,
  );
}
