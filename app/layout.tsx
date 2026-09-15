import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "শ্রী শ্রী মা রক্ষা কালী মন্দির",
  description: "শ্রী শ্রী মা রক্ষা কালী মন্দির — সাহাপুর বটতলা মোড়।",
  applicationName: "মা রক্ষা কালী মন্দির",
  alternates: { languages: { "bn-IN": "/", "en-IN": "/" } },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="bn-IN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
