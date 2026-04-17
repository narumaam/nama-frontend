import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { GoogleProvider } from "@/components/google-provider";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "NAMA OS | AI-First Travel Operating System",
  description: "AI-native travel operating system for DMCs, tour operators and travel agencies. M1–M19 modules — query triage, CRM, itineraries, bookings, finance, and more.",
  applicationName: "NAMA OS",
  keywords: ["travel DMC", "tour operator software", "travel CRM", "itinerary builder", "BYOK AI"],
  authors: [{ name: "NAMA Travel Technologies" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NAMA OS",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    title: "NAMA OS — AI-First Travel Platform",
    description: "The world-class AI-native B2B2C travel operating system for DMCs and tour operators.",
    siteName: "NAMA OS",
  },
  twitter: {
    card: "summary_large_image",
    title: "NAMA OS — AI-First Travel Platform",
    description: "The world-class AI-native B2B2C travel operating system for DMCs and tour operators.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#14B8A6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased text-left">
      <head>
        {/* PWA meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NAMA OS" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="msapplication-TileColor" content="#0F172A" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-white text-slate-900">
        <AuthProvider>{children}</AuthProvider>

        {/* Service Worker Registration — M17 PWA */}
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(reg) {
                      console.log('[NAMA PWA] SW registered, scope:', reg.scope);
                    })
                    .catch(function(err) {
                      console.warn('[NAMA PWA] SW registration failed:', err);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
