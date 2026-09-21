/** @type {import('next').NextConfig} */
const nextConfig = {
  // O build não deve sobrescrever os chunks usados por um `next dev` ativo.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
};

export default nextConfig;
