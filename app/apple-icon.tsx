import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 40,
          background: "linear-gradient(135deg, #0d0821 0%, #2e1065 60%, #4c1d95 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Glow orb behind flame */}
        <div
          style={{
            position: "absolute",
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(249,115,22,0.35) 0%, transparent 70%)",
            bottom: 30,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        />
        {/* Flame emoji */}
        <div
          style={{
            fontSize: 96,
            lineHeight: 1,
            marginTop: -8,
          }}
        >
          🔥
        </div>
        {/* Road to FIRE label */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: 2,
            marginTop: 4,
          }}
        >
          FIRE
        </div>
      </div>
    ),
    { ...size }
  );
}
