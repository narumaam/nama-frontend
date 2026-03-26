import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NAMA | Networked Autonomous Marketplace Architecture",
  description: "AI-native travel operating system for DMCs and agencies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased text-left">
      <body className="min-h-full flex flex-col font-sans bg-white text-slate-900">{children}</body>
    </html>
  );
}
