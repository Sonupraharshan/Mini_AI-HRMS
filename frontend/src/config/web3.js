import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { createAppKit } from '@reown/appkit/react'
import { hardhat, sepolia } from '@reown/appkit/networks'

// 1. Get projectId from env
export const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// 2. Set up Wagmi Adapter
export const networks = [hardhat, sepolia];

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks
});

export const config = wagmiAdapter.wagmiConfig;

// 3. Create the AppKit instance metadata
const metadata = {
  name: 'Mini AI-HRMS',
  description: 'AI-powered HR Management System with Web3 Task Logging',
  url: window.location.origin, // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

// 4. Create modal
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: true
  }
});
