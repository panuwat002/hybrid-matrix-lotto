import type { Metadata } from "next";
import { JetBrains_Mono, IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const thai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-thai",
});

export const metadata: Metadata = {
  title: "Hybrid Matrix — Lotto Analyzer",
  description: "ระบบวิเคราะห์สลากด้วย Deterministic Hybrid Matrix",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${mono.variable} ${thai.variable}`}>
      <body>{children}</body>
    </html>
  );
}
