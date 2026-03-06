/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "canvas",
    "chartjs-node-canvas",
    "mjml",
    "mjml-core",
    "mjml-preset-core",
    "uglify-js",
  ],
};

export default nextConfig;
