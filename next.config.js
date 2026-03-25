/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure Next/Turbopack resolves modules from this project folder.
  // Prevents Next from picking a parent directory that also has a lockfile.
  turbopack: {
    root: __dirname,
  },
}
module.exports = nextConfig
