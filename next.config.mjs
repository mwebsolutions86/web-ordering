/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // C'est l'adresse de votre projet Supabase (celle qui apparaît dans l'erreur)
        hostname: 'kdoodpxjgczqajykcqcd.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;