import type { ReactNode } from "react";
import { Nunito, Quicksand } from "next/font/google";
import "./globals.css";

const bodyFont = Nunito({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "600", "700", "800"]
});

const displayFont = Quicksand({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"]
});

export const metadata = {
  title: "Mate.on",
  description: "Desktop avatar community platform"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>{children}</body>
    </html>
  );
}
