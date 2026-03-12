/**
 * Network Configuration
 * RPC endpoints and chain settings
 */

import { defineChain } from 'viem'
import { lineaSepolia, sepolia, mainnet } from 'wagmi/chains'

/** Polkadot Hub TestNet - EVM compatible chain */
export const polkadotHubTestnet = defineChain({
  id: 420420417,
  name: 'Polkadot Hub Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'DOT',
    symbol: 'DOT',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.polkadot.io/testnet'],
    },
    public: {
      http: ['https://rpc.polkadot.io/testnet'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Polkascan',
      url: 'https://polkascan.io/pre',
    },
  },
  testnet: true,
})

/** Polkadot Hub MainNet */
export const polkadotHub = defineChain({
  id: 420420419,
  name: 'Polkadot Hub',
  nativeCurrency: {
    decimals: 18,
    name: 'DOT',
    symbol: 'DOT',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.polkadot.io'],
    },
    public: {
      http: ['https://rpc.polkadot.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Polkascan',
      url: 'https://polkascan.io',
    },
  },
  testnet: false,
})

export const SUPPORTED_CHAINS = [lineaSepolia, sepolia, mainnet, polkadotHubTestnet] as const

export type SupportedChainId = typeof SUPPORTED_CHAINS[number]['id']

/** RPC endpoints for each chain - CORS-friendly public nodes */
export const RPC_ENDPOINTS: Record<SupportedChainId, string> = {
  [lineaSepolia.id]: process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.sepolia.linea.build',
  [sepolia.id]: 'https://ethereum-sepolia-rpc.publicnode.com',
  [mainnet.id]: 'https://ethereum-rpc.publicnode.com',
  [polkadotHubTestnet.id]: process.env.NEXT_PUBLIC_POLKADOT_RPC_URL || 'https://rpc.polkadot.io/testnet',
}

/** Block explorer URLs for transaction links */
export const EXPLORER_URLS: Record<SupportedChainId, string> = {
  [lineaSepolia.id]: 'https://sepolia.lineascan.build',
  [sepolia.id]: 'https://sepolia.etherscan.io',
  [mainnet.id]: 'https://etherscan.io',
  [polkadotHubTestnet.id]: 'https://polkascan.io/pre',
}

/** External API endpoints */
export const EXTERNAL_APIS = {
  /** Proof of Humanity API */
  POH_API_BASE: 'https://poh-api.linea.build',
  /** Warpcast/Farcaster sharing */
  WARPCAST_SHARE: 'https://warpcast.com/~/compose',
} as const

/** Get explorer URL for a transaction */
export function getTxExplorerUrl(chainId: SupportedChainId, hash: string): string {
  return `${EXPLORER_URLS[chainId]}/tx/${hash}`
}

/** Get explorer URL for an address */
export function getAddressExplorerUrl(chainId: SupportedChainId, address: string): string {
  return `${EXPLORER_URLS[chainId]}/address/${address}`
}
