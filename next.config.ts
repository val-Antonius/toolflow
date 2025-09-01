// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure TypeScript strict mode for better type checking
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Enable experimental features if needed
  experimental: {
    // Enable if you're using React Server Components features
    // serverComponentsExternalPackages: ['prisma'],
  },
  
  // Configure ESLint
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;