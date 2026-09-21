/** @type {import('next').NextConfig} */

// Defaults to the Docker Compose service name; override for local dev
// outside Docker, e.g. BACKEND_URL=http://127.0.0.1:8000 npm run dev
const API_URL = process.env.BACKEND_URL || "http://backend-api:8000";

const nextConfig = {
  reactStrictMode: true,
  outputFileTracing: false,
  webpack: (config) => {
    // Works around a Next.js/webpack bug on some native-Windows setups
    // ("EISDIR: illegal operation on a directory, readlink") where
    // webpack's file-system cache calls readlink on ordinary files.
    // Harmless in the Linux container this app actually ships in.
    config.resolve.symlinks = false;
    // The persistent filesystem cache is what triggers the readlink bug
    // above (it snapshots directories to detect symlink changes).
    // Disabling it costs some rebuild speed but only in dev; production
    // builds in the Linux container are unaffected either way.
    config.cache = false;
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
