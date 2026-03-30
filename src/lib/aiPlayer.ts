/**
 * AI Player Module
 * 
 * Client-side AI move generation for SINGLE_VS_AI game mode.
 * Generates physics-compatible move data without server dependency.
 * 
 * Following Core Principles:
 * - MODULAR: Independent, testable, composable
 * - CLEAN: Pure functions, no side effects
 */

export interface AIMove {
  blockIndex: number
  force: { x: number; y: number; z: number }
  point: { x: number; y: number; z: number }
}

export interface BlockState {
  position: { x: number; y: number; z: number }
  rotation: { y: number }
  userData: { layer: number; isLocked: boolean }
}

export type AIDifficulty = 'EASY' | 'MEDIUM' | 'HARD'

const AI_CONFIG = {
  EASY: {
    delayMs: 2500,
    forceMultiplier: 0.7,
    randomness: 0.5,
    preferEdges: false,
  },
  MEDIUM: {
    delayMs: 1500,
    forceMultiplier: 0.85,
    randomness: 0.3,
    preferEdges: true,
  },
  HARD: {
    delayMs: 800,
    forceMultiplier: 1.0,
    randomness: 0.15,
    preferEdges: true,
  },
} as const

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

function distanceFromCenter(pos: { x: number; z: number }): number {
  return Math.sqrt(pos.x * pos.x + pos.z * pos.z)
}

function pickRandomElement<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]
}

/**
 * Select the best block for the AI to target based on difficulty.
 * Prefers accessible blocks near edges for higher difficulties.
 */
function selectBlock(
  blocks: BlockState[],
  difficulty: AIDifficulty,
  rand: () => number
): number | null {
  const eligible: { index: number; score: number }[] = []

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    if (block.userData.isLocked) continue

    const dist = distanceFromCenter(block.position)
    const height = block.position.y

    // Score: prefer high, edge blocks that are likely removable
    let score = height * 2 + dist

    if (AI_CONFIG[difficulty].preferEdges) {
      // Boost edge blocks (far from center)
      score += dist > 6 ? 5 : 0
      // Boost blocks near the top (higher = more dramatic)
      score += height > 10 ? 3 : 0
    }

    // Add randomness
    score += rand() * AI_CONFIG[difficulty].randomness * 10

    eligible.push({ index: i, score })
  }

  if (eligible.length === 0) return null

  // Sort by score descending, pick from top candidates
  eligible.sort((a, b) => b.score - a.score)
  const topN = eligible.slice(0, Math.min(3, eligible.length))
  return pickRandomElement(topN, rand).index
}

/**
 * Calculate force vector for the AI move.
 * Direction is away from tower center, scaled by difficulty.
 */
function calculateForce(
  block: BlockState,
  difficulty: AIDifficulty,
  rand: () => number
): { x: number; y: number; z: number } {
  const config = AI_CONFIG[difficulty]

  // Direction away from tower center
  const dx = block.position.x
  const dz = block.position.z
  const dist = Math.sqrt(dx * dx + dz * dz)

  let dirX: number, dirZ: number
  if (dist > 0.1) {
    dirX = dx / dist
    dirZ = dz / dist
  } else {
    // Block is near center, pick random direction
    const angle = rand() * Math.PI * 2
    dirX = Math.cos(angle)
    dirZ = Math.sin(angle)
  }

  // Base force magnitude
  const baseForce = 15 + rand() * 10
  const magnitude = baseForce * config.forceMultiplier

  // Add slight random variance
  const varianceX = (rand() - 0.5) * config.randomness * 5
  const varianceZ = (rand() - 0.5) * config.randomness * 5

  return {
    x: dirX * magnitude + varianceX,
    y: 0,
    z: dirZ * magnitude + varianceZ,
  }
}

/**
 * Generate an AI move for the current game state.
 * Returns null if no valid move is possible.
 */
export function generateAIMove(
  blocks: BlockState[],
  difficulty: AIDifficulty = 'MEDIUM',
  seed?: number
): AIMove | null {
  if (blocks.length === 0) return null

  const rand = seed !== undefined ? seededRandom(seed) : Math.random

  const blockIndex = selectBlock(blocks, difficulty, rand)
  if (blockIndex === null) return null

  const block = blocks[blockIndex]
  const force = calculateForce(block, difficulty, rand)

  return {
    blockIndex,
    force,
    point: {
      x: block.position.x,
      y: block.position.y,
      z: block.position.z,
    },
  }
}

/**
 * Get the delay before the AI makes its move.
 * Faster for harder difficulties.
 */
export function getAIMoveDelay(difficulty: AIDifficulty): number {
  return AI_CONFIG[difficulty].delayMs
}
