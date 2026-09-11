import type { Metadata } from "next";
import { Noto_Sans_Bengali, Noto_Serif_Bengali, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { SITE_CONFIG } from "@/config/site";

const notoSansBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-bengali",
  display: "swap",
});

const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ["bengali"],
  weight: ["600", "700", "800"],
  variable: "--font-noto-serif-bengali",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${SITE_CONFIG.name} | সাহাপুর বটতলা মোড়, লহণ্ডা, রায়গঞ্জ`,
  description: `${SITE_CONFIG.tagline}। ${SITE_CONFIG.location.fullAddressBn}। নিত্য পূজা ও অমাবস্যা নির্ঘণ্ট।`,
  keywords: ["রক্ষা কালী মন্দির", "সাহাপুর", "লহণ্ডা", "রায়গঞ্জ", "উত্তর দিনাজপুর", "কালী পূজা", "মন্দির দান UPI"],
  metadataBase: new URL(SITE_CONFIG.canonicalUrl),
  openGraph: {
    title: `${SITE_CONFIG.name} — সাহাপুর বটতলা মোড়`,
    description: SITE_CONFIG.tagline,
    url: SITE_CONFIG.canonicalUrl,
    siteName: SITE_CONFIG.name,
    locale: "bn_IN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bn"
      suppressHydrationWarning
      className={`${notoSansBengali.variable} ${notoSerifBengali.variable} ${plusJakartaSans.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('mandir_theme');
                  var theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-bengali antialiased selection:bg-saffron-600 selection:text-white flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
