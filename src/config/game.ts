/**
 * Game Configuration
 * Physics constants, game modes, and difficulty settings
 */

/** Physics configuration for each difficulty level */
export interface PhysicsConfig {
  friction: number
  restitution: number
  mass: number
  damping: number
}

export const PHYSICS_CONFIGS: Record<'EASY' | 'MEDIUM' | 'HARD', PhysicsConfig> = {
  EASY: { friction: 0.8, restitution: 0.3, mass: 0.5, damping: 0.05 },
  MEDIUM: { friction: 0.5, restitution: 0.4, mass: 1.0, damping: 0.02 },
  HARD: { friction: 0.2, restitution: 0.5, mass: 2.0, damping: 0.01 },
}

/** Default physics config when difficulty not specified */
export const DEFAULT_PHYSICS_CONFIG = PHYSICS_CONFIGS.MEDIUM

/** Get physics config for a difficulty level */
export function getPhysicsConfig(difficulty: 'EASY' | 'MEDIUM' | 'HARD'): PhysicsConfig {
  return PHYSICS_CONFIGS[difficulty] ?? DEFAULT_PHYSICS_CONFIG
}

/** Tower construction settings */
export const TOWER_CONFIG = {
  /** Number of layers in the tower */
  LAYERS: 16,
  /** Blocks per layer */
  BLOCKS_PER_LAYER: 3,
  /** Block dimensions [width, height, depth] */
  BLOCK_SIZE: [6, 1, 1.5] as const,
  /** Vertical spacing between layers */
  LAYER_HEIGHT: 1,
  /** Starting Y position for first layer */
  START_Y: 0.5,
  /** Rotation offset for alternating layers (in radians) */
  LAYER_ROTATION: Math.PI / 2.01,
  /** Horizontal spacing between blocks */
  BLOCK_SPACING: 2,
  /** Total blocks in tower */
  get TOTAL_BLOCKS(): number {
    return this.LAYERS * this.BLOCKS_PER_LAYER
  },
  /** Layers that are locked in SOLO_COMPETITOR mode (0-indexed) */
  LOCKED_LAYERS: [14, 15] as readonly number[], // Top 2 layers
} as const

/** World/scene settings */
export const WORLD_CONFIG = {
  /** Gravity vector [x, y, z] */
  GRAVITY: [0, -30, 0] as const,
  /** Table size [width, height, depth] */
  TABLE_SIZE: [50, 1, 50] as const,
  /** Table Y position */
  TABLE_Y: -0.5,
  /** Scoring radius - blocks beyond this distance from center count as scored */
  SCORING_RADIUS: 10, // radius squared = 100
  /** Game over height for locked blocks */
  LOCKED_BLOCK_GAME_OVER_Y: 2,
  /** Invisible plane size for drag detection */
  DRAG_PLANE_SIZE: [150, 150] as const,
} as const

/** Camera settings */
export const CAMERA_CONFIG = {
  FOV: 35,
  POSITION: [25, 20, 25] as const,
  LOOK_AT: [0, 7, 0] as const,
  NEAR: 1,
  FAR: 1000,
} as const

/** Lighting settings */
export const LIGHTING_CONFIG = {
  AMBIENT_COLOR: 0x444444,
  DIRECTIONAL_COLOR: 0xffffff,
  DIRECTIONAL_POSITION: [20, 30, -5] as const,
} as const

/** Game mode configuration */
export const GAME_MODES = {
  SOLO_PRACTICE: {
    id: 'SOLO_PRACTICE' as const,
    name: 'Practice Mode',
    icon: '🎯',
    hasTimer: false,
    hasStake: false,
    playerCount: 1,
  },
  SOLO_COMPETITOR: {
    id: 'SOLO_COMPETITOR' as const,
    name: 'Solo Competitor',
    icon: '🏆',
    hasTimer: true,
    timerSeconds: 30,
    hasStake: false,
    playerCount: 1,
    lockedLayers: [14, 15],
  },
  SINGLE_VS_AI: {
    id: 'SINGLE_VS_AI' as const,
    name: 'vs AI',
    icon: '🤖',
    hasTimer: false,
    hasStake: true,
    playerCount: 2,
  },
  MULTIPLAYER: {
    id: 'MULTIPLAYER' as const,
    name: 'Multiplayer',
    icon: '👥',
    hasTimer: true,
    timerSeconds: 30,
    hasStake: true,
    playerCount: 2, // configurable
  },
} as const

export type GameModeId = keyof typeof GAME_MODES

/** Impulse/force settings for block interaction */
export const INTERACTION_CONFIG = {
  /** Minimum impulse force */
  MIN_IMPULSE: 5,
  /** Maximum impulse force */
  MAX_IMPULSE: 50,
  /** Multiplier for drag distance to impulse */
  IMPULSE_MULTIPLIER: 10,
  /** Visual indicator max length in pixels */
  MAX_INDICATOR_LENGTH: 150,
  /** Visual indicator scale factor */
  INDICATOR_SCALE: 20,
} as const

/** Game timing settings */
export const TIMING_CONFIG = {
  /** Physics simulation interval (ms) */
  PHYSICS_INTERVAL: 4000,
  /** Worker check interval (ms) */
  WORKER_CHECK_INTERVAL: 50,
  /** Initial worker delay (ms) */
  WORKER_INITIAL_DELAY: 100,
  /** Score animation duration (ms) */
  SCORE_ANIMATION_DURATION: 500,
  /** UI update interval (ms) */
  UI_UPDATE_INTERVAL: 500,
} as const

/** Asset paths */
export const ASSETS = {
  WOOD_TEXTURE: '/images/wood.jpg',
  PLYWOOD_TEXTURE: '/images/plywood.jpg',
  THREE_JS: '/js/three.min.js',
  STATS_JS: '/js/stats.js',
  PHYSI_JS: '/js/physi.js',
  PHYSI_WORKER: '/js/physijs_worker.js',
  AMMO_JS: '/js/ammo.js',
} as const
