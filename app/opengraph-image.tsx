import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "শ্রী শ্রী মা রক্ষা কালী মন্দির — সাহাপুর বটতলা মোড়";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const siteHost = (() => {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname === "localhost") return "";
    return url.host;
  } catch {
    return "";
  }
})();

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      lang="bn-IN"
      dir="ltr"
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 78px",
        background: "#FBF4E6",
        color: "#24201D",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
          maxWidth: 1000,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: "#8F241C",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          শ্রী শ্রী মা রক্ষা কালী মন্দির
        </div>
        <div
          style={{
            fontSize: 64,
            lineHeight: 1.08,
            fontWeight: 800,
            color: "#24201D",
          }}
        >
          মা রক্ষা কালী
        </div>
        <div
          style={{
            fontSize: 34,
            lineHeight: 1.2,
            color: "#8F241C",
          }}
        >
          সাহাপুর বটতলা মোড়
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "3px solid #B08A3E",
          paddingTop: 24,
          fontSize: 24,
          color: "#24201D",
        }}
      >
        <span>মন্দিরের তথ্য • পূজা • পঞ্জিকা • দর্শন</span>
        <span style={{ color: "#C86A12", fontWeight: 700 }}>
          {siteHost}
        </span>
      </div>
    </div>,
    size,
  );
}
