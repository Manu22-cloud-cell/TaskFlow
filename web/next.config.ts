import path from 'node:path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The repository contains separate backend and frontend lockfiles.
  // Keep Turbopack module resolution inside the Next.js application.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
