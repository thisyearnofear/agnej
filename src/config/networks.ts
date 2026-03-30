/**
 * Network Configuration
 * RPC endpoints and chain settings
 */

import { defineChain } from 'viem'
import { lineaSepolia, sepolia, mainnet } from 'wagmi/chains'

/** Flow EVM Testnet */
export const flowEvmTestnet = defineChain({
  id: 545,
  name: 'Flow EVM Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'FLOW',
    symbol: 'FLOW',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.evm.nodes.onflow.org'],
    },
    public: {
      http: ['https://testnet.evm.nodes.onflow.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Flowscan',
      url: 'https://evm-testnet.flowscan.io',
    },
  },
  testnet: true,
})

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

/** Supported Chains for Agnej */
export const SUPPORTED_CHAINS = [
  lineaSepolia, 
  flowEvmTestnet,
  polkadotHubTestnet,
  sepolia, 
  mainnet
] as const

export type SupportedChainId = typeof SUPPORTED_CHAINS[number]['id']

/** RPC endpoints for each chain - CORS-friendly public nodes */
export const RPC_ENDPOINTS: Record<number, string> = {
  [lineaSepolia.id]: process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.sepolia.linea.build',
  [flowEvmTestnet.id]: 'https://testnet.evm.nodes.onflow.org',
  [polkadotHubTestnet.id]: process.env.NEXT_PUBLIC_POLKADOT_RPC_URL || 'https://rpc.polkadot.io/testnet',
  [sepolia.id]: 'https://ethereum-sepolia-rpc.publicnode.com',
  [mainnet.id]: 'https://ethereum-rpc.publicnode.com',
}

/** Block explorer URLs for transaction links */
export const EXPLORER_URLS: Record<number, string> = {
  [lineaSepolia.id]: 'https://sepolia.lineascan.build',
  [flowEvmTestnet.id]: 'https://evm-testnet.flowscan.io',
  [polkadotHubTestnet.id]: 'https://polkascan.io/pre',
  [sepolia.id]: 'https://sepolia.etherscan.io',
  [mainnet.id]: 'https://etherscan.io',
}

/** External API endpoints */
export const EXTERNAL_APIS = {
  /** Proof of Humanity API */
  POH_API_BASE: 'https://poh-api.linea.build',
  /** Warpcast/Farcaster sharing */
  WARPCAST_SHARE: 'https://warpcast.com/~/compose',
} as const

/** Get explorer URL for a transaction */
export function getTxExplorerUrl(chainId: number, hash: string): string {
  const baseUrl = EXPLORER_URLS[chainId] || EXPLORER_URLS[lineaSepolia.id]
  return `${baseUrl}/tx/${hash}`
}

/** Get explorer URL for an address */
export function getAddressExplorerUrl(chainId: number, address: string): string {
  const baseUrl = EXPLORER_URLS[chainId] || EXPLORER_URLS[lineaSepolia.id]
  return `${baseUrl}/address/${address}`
}
