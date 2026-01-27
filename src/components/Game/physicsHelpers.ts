/**
 * Physics Helpers
 * 
 * This file is kept for backward compatibility.
 * New code should import directly from '@/lib/physicsEngine' or '@/config'.
 * 
 * Following Core Principles:
 * - AGGRESSIVE CONSOLIDATION: This file will be removed in a future cleanup
 * - DRY: All physics config now comes from centralized config
 */

import { 
  type PhysicsConfig, 
  PHYSICS_CONFIGS, 
  DEFAULT_PHYSICS_CONFIG,
  getPhysicsConfig as getConfig 
} from '@/config/game'

// Re-export types and functions from centralized config
export type { PhysicsConfig }
export { PHYSICS_CONFIGS, DEFAULT_PHYSICS_CONFIG }

/**
 * Get physics configuration based on difficulty
 * @deprecated Use getPhysicsConfig from '@/config/game' directly
 */
export const getPhysicsConfig = getConfig

/**
 * Load a script dynamically
 * @deprecated Will be moved to PhysicsEngine class
 */
export const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = src
        script.onload = () => resolve()
        script.onerror = reject
        document.head.appendChild(script)
    })
}

// Re-export PhysicsEngine for new code
export { PhysicsEngine, createPhysicsEngine } from '@/lib/physicsEngine'
export type { 
  Vector3, 
  BlockData, 
  PhysicsState, 
  RaycastHit,
  PhysicsEngineConfig,
  DragState,
  PhysicsEventCallback 
} from '@/lib/physicsEngine'
