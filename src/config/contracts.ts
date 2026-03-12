/**
 * Contract Configuration
 * Single source of truth for all blockchain contract addresses
 */

import { lineaSepolia } from 'wagmi/chains'
import { polkadotHubTestnet } from './networks'

/** Linea Sepolia contract addresses (existing) */
const LINEA_ADDRESSES = {
  HOUSE_OF_CARDS: '0x1DFd9003590E4A67594748Ecec18451e6cBDDD90',
  LEADERBOARD: '0x9E35aB6885bED1E34ea531d39CAe377815Ab7Fb9',
} as const

/** Polkadot Hub TestNet contract addresses (to be deployed) */
const POLKADOT_ADDRESSES = {
  HOUSE_OF_CARDS: '0x0000000000000000000000000000000000000001', // TODO: Deploy and update
  LEADERBOARD: '0x0000000000000000000000000000000000000002', // TODO: Deploy and update
} as const

/** Get contract address based on chain */
function getContractAddress(contract: 'HOUSE_OF_CARDS' | 'LEADERBOARD', chainId: number): string {
  if (chainId === polkadotHubTestnet.id) {
    return POLKADOT_ADDRESSES[contract]
  }
  return LINEA_ADDRESSES[contract]
}

export const CONTRACTS = {
  /** HouseOfCards game contract - handles game logic, betting, pot distribution */
  HOUSE_OF_CARDS: {
    address: LINEA_ADDRESSES.HOUSE_OF_CARDS,
    polkadotAddress: POLKADOT_ADDRESSES.HOUSE_OF_CARDS,
    abi: 'HouseOfCardsABI' as const,
    getAddress: (chainId: number) => getContractAddress('HOUSE_OF_CARDS', chainId),
  },
  
  /** Leaderboard contract - handles score submission and rankings */
  LEADERBOARD: {
    address: LINEA_ADDRESSES.LEADERBOARD,
    polkadotAddress: POLKADOT_ADDRESSES.LEADERBOARD,
    abi: 'LeaderboardABI' as const,
    getAddress: (chainId: number) => getContractAddress('LEADERBOARD', chainId),
  },
} as const

/** Zero address for referrals */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

/** Contract ABIs exported for type safety */
export type ContractName = keyof typeof CONTRACTS
export type ContractAddress = typeof CONTRACTS[ContractName]['address']
