/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/:path*', // Proxy API requests to Backend
      },
      {
        source: '/recordings/:path*',
        destination: 'http://127.0.0.1:8000/recordings/:path*', // Proxy recording requests to Backend
      },
    ];
  },
}

export default nextConfig
