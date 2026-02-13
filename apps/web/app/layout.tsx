import type { ReactNode } from "react";

export const metadata = {
  title: "Mate.on",
  description: "Desktop avatar community platform"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}