import { ANIMATION_CONFIG } from '@/config'

export interface WobbleState {
  active: boolean
  startTime: number
  amplitude: number
  decay: number
}

export function createWobble(
  amplitude: number = ANIMATION_CONFIG.WOBBLE_MAX_AMPLITUDE,
  decay: number = ANIMATION_CONFIG.WOBBLE_DECAY
): WobbleState {
  return { active: true, startTime: Date.now(), amplitude, decay }
}

export function getWobbleOffset(state: WobbleState, elapsed: number): number {
  if (!state.active || elapsed > state.decay) {
    state.active = false
    return 0
  }
  const decayFactor = 1 - elapsed / state.decay
  return Math.sin(elapsed * Math.PI * 6) * state.amplitude * decayFactor
}

export function getTowerSway(time: number): number {
  return Math.sin(time * ANIMATION_CONFIG.SWAY_SPEED) * ANIMATION_CONFIG.SWAY_AMPLITUDE
}
