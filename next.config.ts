import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // Pour les images de démo
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co', // Pour tes futures images Supabase
      },
    ],
  },
};

export default nextConfig;