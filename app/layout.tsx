import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "শ্রী শ্রী মা রক্ষা কালী মন্দির",
  description:
    "শ্রী শ্রী মা রক্ষা কালী মন্দিরের সরকারি ওয়েবসাইট বর্তমানে নির্মাণ ও রক্ষণাবেক্ষণের অধীনে রয়েছে।",
  robots: {
    index: false,
    follow: false
  },
  icons: {
    icon: "/favicon.svg"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn-IN">
      <body>{children}</body>
    </html>
  );
}
