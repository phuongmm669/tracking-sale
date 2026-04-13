import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // !! CẢNH BÁO !!
    // Cho phép build thành công ngay cả khi dự án có lỗi TypeScript.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
