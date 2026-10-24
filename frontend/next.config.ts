import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML export so the app can be served from GitHub Pages (`next build` writes `out/`).
  output: "export",
  // GitHub Pages serves project sites under /<repo>; the deploy workflow sets this. Empty locally.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  trailingSlash: true,
};

export default nextConfig;
