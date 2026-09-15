import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "শ্রী শ্রী মা রক্ষা কালী মন্দির",
    short_name: "রক্ষা কালী মন্দির",
    description: "শ্রী শ্রী মা রক্ষা কালী মন্দির — সাহাপুর বটতলা মোড়।",
    lang: "bn-IN",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: "#8F241C",
    background_color: "#FBF4E6",
    icons: [
      {
        src: "/branding/favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/branding/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
