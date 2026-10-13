import type { NextConfig } from "next";
// Server-side destination. Browser requests stay on the FE origin with session cookies.
const backend = (process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8081").replace(/\/$/, "");
const nextConfig: NextConfig = {
  async rewrites() { return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }]; },
};
export default nextConfig;
