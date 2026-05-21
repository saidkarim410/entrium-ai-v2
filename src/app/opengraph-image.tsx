import { ImageResponse } from "next/og"

export const runtime = "edge"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Entrium AI — AI-консультант по поступлению в зарубежные университеты"

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
          background: "#f5f5f5",
          color: "#0a0a0a",
          fontFamily: "sans-serif",
          padding: "80px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            background: "#ED1C24",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: "#ED1C24",
              color: "white",
              borderRadius: 14,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 32,
            }}
          >
            ❤
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -0.5 }}>
            <span>Entr</span>
            <span style={{ color: "#ED1C24" }}>ium AI</span>
          </div>
        </div>
        <div
          style={{
            fontSize: 92,
            fontWeight: 800,
            letterSpacing: -2.5,
            textAlign: "center",
            lineHeight: 0.95,
            marginTop: 20,
            textTransform: "uppercase",
          }}
        >
          Твой шанс на{" "}
          <span style={{ color: "#ED1C24" }}>MIT · Stanford</span>
        </div>
        <div
          style={{
            fontSize: 26,
            color: "rgba(10,10,10,0.6)",
            marginTop: 36,
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          AI-анализ профиля · 1500+ университетов · 300+ стипендий · RU / EN / UZ
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 8,
            background: "#ED1C24",
          }}
        />
      </div>
    ),
    { ...size }
  )
}
