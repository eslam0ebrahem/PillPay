import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    serverExternalPackages: ["mongoose", "bcrypt", "jsonwebtoken", "exceljs"],
};

export default nextConfig;
