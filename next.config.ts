import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // The warning suggested turbopack.root but the experimental type is strict.
  // Removing the broken experimental block for now.
};

export default nextConfig;
