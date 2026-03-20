/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removing ignoreDuringBuilds is recommended once you fix linting/types
  // for a more secure production build.
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
};

module.exports = nextConfig;
