/**
 * Contract Configuration
 * Single source of truth for all blockchain contract addresses
 */

export const CONTRACTS = {
  /** HouseOfCards game contract - handles game logic, betting, pot distribution */
  HOUSE_OF_CARDS: {
    address: '0x1DFd9003590E4A67594748Ecec18451e6cBDDD90' as const,
    abi: 'HouseOfCardsABI' as const,
  },
  
  /** Leaderboard contract - handles score submission and rankings */
  LEADERBOARD: {
    address: '0x9E35aB6885bED1E34ea531d39CAe377815Ab7Fb9' as const,
    abi: 'LeaderboardABI' as const,
  },
} as const

/** Zero address for referrals */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

/** Contract ABIs exported for type safety */
export type ContractName = keyof typeof CONTRACTS
export type ContractAddress = typeof CONTRACTS[ContractName]['address']
