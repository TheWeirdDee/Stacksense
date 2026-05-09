import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: [
    '@stacks/connect',
    '@stacks/connect-ui',
    '@stacks/network',
    '@stacks/transactions',
    '@stacks/auth',
    '@stacks/storage',
    '@stacks/encryption',
    '@stacks/wallet-sdk',
  ],
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
}

export default nextConfig
