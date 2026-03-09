import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sage",
  description: "Ask anything. Discover everything.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/favicon-32.png",
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sage",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body className="antialiased font-body">
        {/* PWA loading screen — visible until React hydrates and removes it */}
        <div
          id="pwa-splash"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#08080c",
            transition: "opacity 0.3s ease-out",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 35% 30%, #c4956a 0%, #e07c38 40%, #d16426 80%, #8b4022 100%)",
              boxShadow: "0 0 40px rgba(224, 124, 56, 0.3), 0 0 80px rgba(196, 149, 106, 0.15)",
              animation: "pulse-orb 2s ease-in-out infinite",
            }}
          />
        </div>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
