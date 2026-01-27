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
