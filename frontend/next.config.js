const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'aobwawbezgggqcmfqopk.supabase.co'],
  },
  webpack: (config) => {
    // Fix Windows/OneDrive case-sensitivity issue (C:\Users vs c:\Users)
    // that causes duplicate module loading and hydration errors
    config.resolve = {
      ...config.resolve,
      symlinks: false,
    }
    config.snapshot = {
      ...config.snapshot,
      managedPaths: [path.resolve(__dirname, 'node_modules')],
    }
    return config
  },
}

module.exports = nextConfig
