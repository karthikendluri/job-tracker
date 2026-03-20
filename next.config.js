/** @type {import('next').NextConfig} */
const nextConfig = {
  // Recommendation: Turn these to 'false' to keep your code high-quality
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  // Optional: If you use external images for company logos
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

module.exports = nextConfig;
