/**
 * useRenderLoop - RAF loop, tower animations, timer, physics watchdog
 * 
 * Following Core Principles:
 * - MODULAR: Self-contained render concern
 * - CLEAN: Explicit dependency injection via params
 */

import { useRef, useCallback } from 'react'
import { getTowerSway, getWobbleOffset, type WobbleState } from '@/lib/towerAnimations'
import type { ToastMessage } from './useToast'

interface UseRenderLoopParams {
  engineRef: React.MutableRefObject<any>
  sceneRef: React.MutableRefObject<any>
  blocksRef: React.MutableRefObject<any[]>
  wobbleRef: React.MutableRefObject<WobbleState | null>
  orbitControlsRef: React.MutableRefObject<any>
  gameOverRef: React.MutableRefObject<boolean>
  lastTimerTickRef: React.MutableRefObject<number>
  gameMode: string
  decrementTimer: () => boolean
  endGame: (collapsed?: boolean) => void
  addToast: (toast: Omit<ToastMessage, 'id'>) => void
}

export function useRenderLoop({
  engineRef,
  sceneRef,
  blocksRef,
  wobbleRef,
  orbitControlsRef,
  gameOverRef,
  lastTimerTickRef,
  gameMode,
  decrementTimer,
  endGame,
  addToast,
}: UseRenderLoopParams) {
  const requestRef = useRef<number | undefined>(undefined)

  const render = useCallback(function () {
    requestRef.current = requestAnimationFrame(render)
    if (engineRef.current.renderer && sceneRef.current && engineRef.current.camera) {
      // Update orbit controls
      if (orbitControlsRef.current) {
        orbitControlsRef.current.update()
      }

      engineRef.current.renderer.render(sceneRef.current, engineRef.current.camera)

      // Tower animations
      const time = performance.now() / 1000

      // Tower sway
      const sway = getTowerSway(time)
      blocksRef.current.forEach(block => {
        if (!block.userData._baseRotY) block.userData._baseRotY = block.rotation.y
        block.rotation.y = block.userData._baseRotY + sway
      })

      // Tower wobble
      if (wobbleRef.current?.active) {
        const elapsed = (Date.now() - wobbleRef.current.startTime) / 1000
        const offset = getWobbleOffset(wobbleRef.current, elapsed)
        blocksRef.current.forEach(block => {
          if (!block.userData._baseRotZ) block.userData._baseRotZ = block.rotation.z
          block.rotation.z = block.userData._baseRotZ + offset
        })
      }

      // Solo timer (decrement once per second based on performance.now())
      if (gameMode === 'SOLO_COMPETITOR' && !gameOverRef.current) {
        const now = performance.now()
        if (now - lastTimerTickRef.current >= 1000) {
          const reachedZero = decrementTimer()
          lastTimerTickRef.current = now
          if (reachedZero) {
            endGame(false)
            gameOverRef.current = true
            addToast({ type: 'error', message: "Time's up!" })
          }
        }
      }

      // Physics watchdog
      if (gameMode === 'SOLO_PRACTICE' || gameMode === 'SOLO_COMPETITOR') {
        const now = Date.now()
        if (now - engineRef.current.lastPhysicsUpdate > 4000) {
          console.warn('Physics stalled (>4s), restarting simulation...')
          engineRef.current.lastPhysicsUpdate = now
          sceneRef.current.simulate()
        }
      }
    }
  }, [engineRef, sceneRef, blocksRef, wobbleRef, orbitControlsRef, gameOverRef, lastTimerTickRef, gameMode, decrementTimer, endGame, addToast])

  const startRenderLoop = useCallback(() => {
    requestRef.current = requestAnimationFrame(render)
  }, [render])

  const stopRenderLoop = useCallback(() => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current)
      requestRef.current = undefined
    }
  }, [])

  return { requestRef, startRenderLoop, stopRenderLoop }
}
