import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Roadmap LMS",
  description: "Personal LMS for the embedded systems roadmap.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0d10",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
