import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store-provider";

const inter = Inter({ subsets: ["latin"] });

// ✅ CORRECTION : Export séparé pour le Viewport (Next.js 14+)
export const viewport: Viewport = {
  themeColor: "#FF6B35",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Universal Eats - Livraison de repas",
  description: "Votre plateforme de livraison de repas favorite avec fidélité et promotions exclusives.",
  applicationName: "Universal Eats",
  authors: [{ name: "Universal Eats Team" }],
  keywords: ["livraison", "repas", "food delivery", "restaurant", "PWA"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Universal Eats",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://kdoodpxjgczqajykcqcd.supabase.co" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}