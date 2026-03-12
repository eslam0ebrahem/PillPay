import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    serverExternalPackages: ["mongoose", "bcrypt", "jsonwebtoken", "exceljs"],
    // @ts-ignore - turbopack is a top-level property in Next.js 16 for workspace roots
    turbopack: {
        root: "/Users/IslamIbrahim/Work/Projects/PillPay",
    },
};

export default nextConfig;
