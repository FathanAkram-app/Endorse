import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Endorse — Your brand. Their creativity. A perfect match.",
  description: "Discover content creators, compare collaboration rates and experience, and explore brand opportunities with Endorse.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
