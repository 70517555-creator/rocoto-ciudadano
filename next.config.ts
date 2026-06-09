import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tratar estas librerías como externas del servidor (pesadas / solo servidor):
  // así Next.js no intenta empaquetarlas.
  serverExternalPackages: ["firebase-admin", "unpdf", "iconv-lite"],
};

export default nextConfig;
