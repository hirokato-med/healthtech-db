import type { NextConfig } from 'next';

/**
 * 静的書き出し（`next build` → `out/`）。
 * GitHub Pages / Vercel / Cloudflare Pages など、どこにでも置けるようにする。
 */
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
