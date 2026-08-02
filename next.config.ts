import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle so the Docker image stays small.
  // Vercel ignores this and deploys normally.
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "graph.facebook.com" },
    ],
  },
};

export default nextConfig;
