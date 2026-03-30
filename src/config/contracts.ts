/**
 * Contract Configuration
 * Single source of truth for all blockchain contract addresses
 */

import { lineaSepolia } from 'wagmi/chains'
import { polkadotHubTestnet, flowEvmTestnet } from './networks'

/** Contract address mapping per chain */
const CONTRACT_ADDRESSES: Record<string, Record<number, string>> = {
  HOUSE_OF_CARDS: {
    [lineaSepolia.id]: '0x1DFd9003590E4A67594748Ecec18451e6cBDDD90',
    [flowEvmTestnet.id]: '0x0000000000000000000000000000000000000545', // TODO: Deploy to Flow
    [polkadotHubTestnet.id]: '0x0000000000000000000000000000000000000417', // TODO: Deploy to Polkadot
  },
  LEADERBOARD: {
    [lineaSepolia.id]: '0x9E35aB6885bED1E34ea531d39CAe377815Ab7Fb9',
    [flowEvmTestnet.id]: '0x0000000000000000000000000000000000000546', // TODO: Deploy to Flow
    [polkadotHubTestnet.id]: '0x0000000000000000000000000000000000000418', // TODO: Deploy to Polkadot
  }
}

/** Get contract address based on chain */
function getContractAddress(contract: keyof typeof CONTRACT_ADDRESSES, chainId: number): string {
  const addresses = CONTRACT_ADDRESSES[contract]
  return addresses[chainId] || addresses[lineaSepolia.id]
}

export const CONTRACTS = {
  /** HouseOfCards game contract - handles game logic, betting, pot distribution */
  HOUSE_OF_CARDS: {
    abi: 'HouseOfCardsABI' as const,
    getAddress: (chainId: number) => getContractAddress('HOUSE_OF_CARDS', chainId),
  },
  
  /** Leaderboard contract - handles score submission and rankings */
  LEADERBOARD: {
    abi: 'LeaderboardABI' as const,
    getAddress: (chainId: number) => getContractAddress('LEADERBOARD', chainId),
  },
} as const

/** Zero address for referrals */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

/** Contract ABIs exported for type safety */
export type ContractName = keyof typeof CONTRACTS
