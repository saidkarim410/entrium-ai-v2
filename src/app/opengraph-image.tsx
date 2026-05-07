import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Entrium AI — Поступление в зарубежные университеты с AI"

export default async function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0a0a0a 0%, #18181b 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: "80px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "1000px",
            height: "1000px",
            background: "radial-gradient(circle, rgba(120,119,198,0.15) 0%, transparent 70%)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: "white",
              color: "black",
              borderRadius: 14,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 32,
            }}
          >
            ✦
          </div>
          <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: -0.5 }}>Entrium AI</div>
        </div>
        <div
          style={{
            fontSize: 84,
            fontWeight: 600,
            letterSpacing: -2,
            textAlign: "center",
            lineHeight: 1.05,
            marginTop: 20,
          }}
        >
          Твой старший брат
          <br />
          по поступлению
        </div>
        <div
          style={{
            fontSize: 28,
            color: "rgba(255,255,255,0.6)",
            marginTop: 36,
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          8 AI-инструментов · 1504 университета QS · 289 стипендий
        </div>
      </div>
    ),
    { ...size }
  )
}
