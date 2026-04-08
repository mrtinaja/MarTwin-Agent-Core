/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Desactivamos esto para que sea más liviano
  swcMinify: false,       // Evitamos el compilador que te da error de Win32
};

export default nextConfig;