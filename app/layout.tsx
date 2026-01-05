import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Universal Eats - Livraison de repas",
  description: "Votre plateforme de livraison de repas favorite avec fidélité et promotions exclusives. Installez l'app pour une expérience native !",
  applicationName: "Universal Eats",
  authors: [{ name: "Universal Eats Team" }],
  keywords: ["livraison", "repas", "food delivery", "restaurant", "commande en ligne", "PWA"],
  themeColor: "#FF6B35",
  colorScheme: "light",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Universal Eats",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://universaleats.com",
    title: "Universal Eats - Livraison de repas",
    description: "Votre plateforme de livraison de repas favorite avec fidélité et promotions exclusives",
    siteName: "Universal Eats",
  },
  twitter: {
    card: "summary_large_image",
    title: "Universal Eats - Livraison de repas",
    description: "Votre plateforme de livraison de repas favorite avec fidélité et promotions exclusives",
    creator: "@UniversalEats",
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
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Universal Eats" />
        <meta name="msapplication-TileColor" content="#FF6B35" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* Preconnect pour optimiser les performances */}
        <link rel="preconnect" href="https://kdoodpxjgczqajykcqcd.supabase.co" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS Prefetch pour les APIs externes */}
        <link rel="dns-prefetch" href="//maps.googleapis.com" />
        <link rel="dns-prefetch" href="//api.universaleats.com" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}