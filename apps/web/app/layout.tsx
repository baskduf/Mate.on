import type { ReactNode } from "react";
import { Noto_Sans_KR, Gowun_Batang } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const bodyFont = Noto_Sans_KR({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "700"],
  display: "swap"
});

const displayFont = Gowun_Batang({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "700"],
  display: "swap"
});

export const metadata = {
  title: "Mate.on",
  description: "Desktop avatar community platform"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--ghibli-cloud)",
              border: "1.5px solid var(--ghibli-mist)",
              color: "var(--ghibli-ink)",
              fontFamily: "var(--font-body)",
              boxShadow: "var(--shadow-md)",
            },
          }}
        />
      </body>
    </html>
  );
}
