import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the Turbopack root to the monorepo root (where package-lock.json
    // lives) so `next`, `react`, and other hoisted deps resolve correctly.
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
