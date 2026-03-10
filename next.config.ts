import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    serverExternalPackages: ["mongoose", "bcrypt", "jsonwebtoken", "exceljs"],
};

export default nextConfig;
