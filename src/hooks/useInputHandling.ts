/**
 * useInputHandling - Mouse/touch block interaction, hover highlighting, drag
 * 
 * Following Core Principles:
 * - MODULAR: Self-contained input concern
 * - CLEAN: Explicit dependency injection via params
 */

import { useCallback } from 'react'
import { createWobble } from '@/lib/towerAnimations'

interface UseInputHandlingParams {
  engineRef: React.MutableRefObject<any>
  blocksRef: React.MutableRefObject<any[]>
  orbitControlsRef: React.MutableRefObject<any>
  hoveredBlockRef: React.MutableRefObject<any>
  dragStartRef: React.MutableRefObject<any>
  wobbleRef: React.MutableRefObject<any>
  socketRef: React.MutableRefObject<any>
  eventHandlersRef: React.MutableRefObject<{
    handleMouseMove: ((evt: MouseEvent) => void) | null
    handleInputStart: ((evt: MouseEvent | TouchEvent) => void) | null
    handleInputMove: ((evt: MouseEvent | TouchEvent) => void) | null
    handleInputEnd: ((evt: MouseEvent | TouchEvent) => void) | null
  }>
  aiTurnRef: React.MutableRefObject<boolean>
  gameMode: string
  gameState: string
  isSpectator: boolean
  isCurrentPlayer: boolean
  isGameOver: boolean
  showRulesRef: React.MutableRefObject<boolean>
  showHelpersRef: React.MutableRefObject<boolean>
  setShowRules: (show: boolean) => void
  setDragIndicator: (indicator: any) => void
  executeAIMove: () => void
}

export function useInputHandling(params: UseInputHandlingParams) {
  const {
    engineRef,
    blocksRef,
    orbitControlsRef,
    hoveredBlockRef,
    dragStartRef,
    wobbleRef,
    socketRef,
    eventHandlersRef,
    aiTurnRef,
    gameMode,
    gameState,
    isSpectator,
    isCurrentPlayer,
    isGameOver,
    showRulesRef,
    showHelpersRef,
    setShowRules,
    setDragIndicator,
    executeAIMove,
  } = params

  const initEventHandling = useCallback(function () {
    const engine = engineRef.current
    if (!engine.renderer || !engine.renderer.domElement) {
      console.error('Renderer or renderer DOM element not available')
      return
    }

    const getEventPos = (evt: MouseEvent | TouchEvent) => {
      let clientX, clientY
      if ((evt as TouchEvent).changedTouches && (evt as TouchEvent).changedTouches.length > 0) {
        clientX = (evt as TouchEvent).changedTouches[0].clientX
        clientY = (evt as TouchEvent).changedTouches[0].clientY
      } else {
        clientX = (evt as MouseEvent).clientX
        clientY = (evt as MouseEvent).clientY
      }
      return { clientX, clientY }
    }

    // Hover highlight handler
    const handleMouseMove = function (evt: MouseEvent) {
      // Skip hover if dragging
      if (engine.interaction.selectedBlock !== null) return

      // Clear previous hover
      if (hoveredBlockRef.current) {
        const prev = hoveredBlockRef.current
        if (prev.material && prev.userData._hoverOrigEmissive !== undefined) {
          prev.material.emissive = new THREE.Color(prev.userData._hoverOrigEmissive)
          prev.material.emissiveIntensity = 0
          delete prev.userData._hoverOrigEmissive
        }
        hoveredBlockRef.current = null
      }

      // Inline raycasting
      const rect = engine.renderer.domElement.getBoundingClientRect()
      const nx = ((evt.clientX - rect.left) / rect.width) * 2 - 1
      const ny = -((evt.clientY - rect.top) / rect.height) * 2 + 1
      const vector = new THREE.Vector3(nx, ny, 1)
      vector.unproject(engine.camera)
      const ray = new THREE.Raycaster(engine.camera.position, vector.sub(engine.camera.position).normalize())
      const hits = ray.intersectObjects(blocksRef.current)

      if (hits.length > 0) {
        const block = hits[0].object
        const canMove = !(gameMode === 'SOLO_COMPETITOR' && block.userData?.layer >= 14)

        engine.renderer.domElement.style.cursor = canMove ? 'pointer' : 'not-allowed'

        if (canMove && block.material) {
          block.userData._hoverOrigEmissive = block.material.emissive ? block.material.emissive.getHex() : 0x000000
          block.material.emissive = new THREE.Color(0xffe066)
          block.material.emissiveIntensity = 0.25
          hoveredBlockRef.current = block
        }
      } else {
        engine.renderer.domElement.style.cursor = 'default'
      }
    }

    const handleInputStart = function (evt: MouseEvent | TouchEvent) {
      if (showRulesRef.current) {
        setShowRules(false)
        return
      }

      if (isSpectator || gameState !== 'ACTIVE' || isGameOver) return
      if (gameMode === 'MULTIPLAYER' && !isCurrentPlayer) return
      if (gameMode === 'SINGLE_VS_AI' && aiTurnRef.current) return
      if (evt.type === 'touchstart') evt.preventDefault()

      // Disable orbit during drag
      if (orbitControlsRef.current) orbitControlsRef.current.enabled = false

      const { clientX, clientY } = getEventPos(evt)
      const rect = engine.renderer.domElement.getBoundingClientRect()
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1
      const ny = -((clientY - rect.top) / rect.height) * 2 + 1

      const vector = new THREE.Vector3(nx, ny, 1)
      vector.unproject(engine.camera)
      const ray = new THREE.Raycaster(engine.camera.position, vector.sub(engine.camera.position).normalize())
      const intersections = ray.intersectObjects(blocksRef.current)

      if (intersections.length > 0) {
        const block = intersections[0].object

        if (gameMode === 'SOLO_COMPETITOR' && block.userData?.layer >= 14) {
          console.warn('Cannot move blocks from top 2 levels!')
          return
        }

        engine.interaction.selectedBlock = block

        if (showHelpersRef.current && block.material) {
          block.userData.originalEmissive = block.material.emissive ? block.material.emissive.getHex() : 0x000000
          block.material.emissive = new THREE.Color(0x00ff00)
          block.material.emissiveIntensity = 0.3
        }

        if (evt.type === 'touchstart' && 'vibrate' in navigator) {
          navigator.vibrate(10)
        }

        engine.interaction.plane.position.y = engine.interaction.selectedBlock.position.y

        const planeHit = ray.intersectObject(engine.interaction.plane)
        if (planeHit.length > 0) {
          engine.interaction.mousePos.copy(planeHit[0].point)
          dragStartRef.current = planeHit[0].point.clone()
        } else {
          dragStartRef.current = null
        }
      }
    }

    const handleInputEnd = function (evt: MouseEvent | TouchEvent) {
      // Re-enable orbit
      if (orbitControlsRef.current) orbitControlsRef.current.enabled = true

      if (engine.interaction.selectedBlock !== null) {
        const block = engine.interaction.selectedBlock
        if (block.material && block.userData.originalEmissive !== undefined) {
          block.material.emissive = new THREE.Color(block.userData.originalEmissive)
          block.material.emissiveIntensity = 0
          delete block.userData.originalEmissive
        }

        const start = dragStartRef.current
        let end = engine.interaction.mousePos.clone()
        if (start) end.y = start.y
        const delta = new THREE.Vector3().copy(end).sub(start || engine.interaction.selectedBlock.position)
        delta.y = 0
        const length = delta.length()
        const dir = length > 0 ? delta.normalize() : new THREE.Vector3(1, 0, 0)
        const impulse = dir.multiplyScalar(Math.max(5, Math.min(50, length * 10)))

        if (evt.type === 'touchend' && 'vibrate' in navigator) {
          const vibrationStrength = Math.min(50, Math.max(10, length * 5))
          navigator.vibrate(vibrationStrength)
        }

        // Trigger wobble proportional to pull force
        const wobbleAmplitude = Math.min(0.02, length * 0.003)
        if (wobbleAmplitude > 0.002) {
          wobbleRef.current = createWobble(wobbleAmplitude)
        }

        const blockIndex = blocksRef.current.indexOf(engine.interaction.selectedBlock)

        if (gameMode === 'SOLO_PRACTICE' || gameMode === 'SOLO_COMPETITOR') {
          if (block.setAngularVelocity) block.setAngularVelocity(new THREE.Vector3(0, 0, 0))
          if (block.setLinearVelocity) block.setLinearVelocity(new THREE.Vector3(0, 0, 0))

          if (typeof block.applyCentralImpulse === 'function') {
            block.applyCentralImpulse(impulse)
          } else {
            block.applyCentralForce(impulse)
          }
        } else if (gameMode === 'SINGLE_VS_AI') {
          // Apply human move locally, then trigger AI response
          if (block.setAngularVelocity) block.setAngularVelocity(new THREE.Vector3(0, 0, 0))
          if (block.setLinearVelocity) block.setLinearVelocity(new THREE.Vector3(0, 0, 0))

          if (typeof block.applyCentralImpulse === 'function') {
            block.applyCentralImpulse(impulse)
          } else {
            block.applyCentralForce(impulse)
          }

          executeAIMove()
        } else if (socketRef.current && blockIndex !== -1) {
          socketRef.current.emit('submitMove', {
            blockIndex: blockIndex,
            force: { x: impulse.x, y: impulse.y, z: impulse.z },
            point: { x: engine.interaction.selectedBlock.position.x, y: engine.interaction.selectedBlock.position.y, z: engine.interaction.selectedBlock.position.z }
          })
        }

        engine.interaction.selectedBlock = null
        dragStartRef.current = null
        setDragIndicator(null)
      }
    }

    const handleInputMove = function (evt: MouseEvent | TouchEvent) {
      if (evt.type === 'touchmove') evt.preventDefault()

      if (engine.interaction.selectedBlock !== null) {
        const { clientX, clientY } = getEventPos(evt)
        const rect = engine.renderer.domElement.getBoundingClientRect()
        const nx = ((clientX - rect.left) / rect.width) * 2 - 1
        const ny = -((clientY - rect.top) / rect.height) * 2 + 1

        const vector = new THREE.Vector3(nx, ny, 1)
        vector.unproject(engine.camera)
        const ray = new THREE.Raycaster(engine.camera.position, vector.sub(engine.camera.position).normalize())

        engine.interaction.plane.position.y = engine.interaction.selectedBlock.position.y

        const intersection = ray.intersectObject(engine.interaction.plane)
        if (intersection.length > 0) {
          engine.interaction.mousePos.copy(intersection[0].point)

          if (showHelpersRef.current && dragStartRef.current) {
            const start = dragStartRef.current
            const end = engine.interaction.mousePos.clone()
            end.y = start.y
            const delta = new THREE.Vector3().copy(end).sub(start)
            delta.y = 0
            const length = delta.length()
            const angle = Math.atan2(delta.z, delta.x) * (180 / Math.PI)

            const screenStart = start.clone().project(engine.camera)
            const screenX = (screenStart.x + 1) / 2 * rect.width
            const screenY = (1 - screenStart.y) / 2 * rect.height

            setDragIndicator({ x: screenX, y: screenY, length: length * 20, angle })
          }
        }
      }
    }

    // Mouse events
    engine.renderer.domElement.addEventListener('mousemove', handleMouseMove)
    engine.renderer.domElement.addEventListener('mousedown', handleInputStart)
    engine.renderer.domElement.addEventListener('mousemove', handleInputMove)
    engine.renderer.domElement.addEventListener('mouseup', handleInputEnd)

    // Touch events
    engine.renderer.domElement.addEventListener('touchstart', handleInputStart, { passive: false })
    engine.renderer.domElement.addEventListener('touchmove', handleInputMove, { passive: false })
    engine.renderer.domElement.addEventListener('touchend', handleInputEnd)

    // Store handlers for cleanup
    eventHandlersRef.current = {
      handleMouseMove,
      handleInputStart,
      handleInputMove,
      handleInputEnd
    }
  }, [engineRef, blocksRef, orbitControlsRef, hoveredBlockRef, dragStartRef, wobbleRef, socketRef, eventHandlersRef, aiTurnRef, gameMode, gameState, isSpectator, isCurrentPlayer, isGameOver, showRulesRef, showHelpersRef, setShowRules, setDragIndicator, executeAIMove])

  const cleanupEventHandling = useCallback(function () {
    const engine = engineRef.current
    const handlers = eventHandlersRef.current

    if (engine.renderer && engine.renderer.domElement && handlers.handleMouseMove) {
      engine.renderer.domElement.removeEventListener('mousemove', handlers.handleMouseMove)
      engine.renderer.domElement.removeEventListener('mousedown', handlers.handleInputStart!)
      engine.renderer.domElement.removeEventListener('mousemove', handlers.handleInputMove!)
      engine.renderer.domElement.removeEventListener('mouseup', handlers.handleInputEnd!)
      engine.renderer.domElement.removeEventListener('touchstart', handlers.handleInputStart!)
      engine.renderer.domElement.removeEventListener('touchmove', handlers.handleInputMove!)
      engine.renderer.domElement.removeEventListener('touchend', handlers.handleInputEnd!)
    }

    eventHandlersRef.current = {
      handleMouseMove: null,
      handleInputStart: null,
      handleInputMove: null,
      handleInputEnd: null
    }
  }, [engineRef, eventHandlersRef])

  return { initEventHandling, cleanupEventHandling }
}
