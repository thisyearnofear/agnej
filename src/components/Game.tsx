'use client'

import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useAccount } from 'wagmi'
import { GameSettingsConfig } from './GameSettings'
import { loadScript } from './Game/physicsHelpers'
import { getPhysicsConfig, ORBIT_CONFIG, ASSETS } from '@/config'
import { createWobble, getWobbleOffset, getTowerSway, type WobbleState } from '@/lib/towerAnimations'
import { generateWoodTexture, generatePlywoodTexture } from '@/lib/textures'
import { generateAIMove, getAIMoveDelay, type BlockState, type AIDifficulty } from '@/lib/aiPlayer'

declare global {
  var Physijs: any
  var THREE: any
  var Stats: any
  interface Window {
    Stats: any
    Physijs: any
    THREE: any
  }
}

import GameUI, { type GameState } from './GameUI'
import GameOver from './MultiplayerGameOver'
import SpectatorOverlay from './SpectatorOverlay'
import ToastContainer from './ui/Toast'

import { useGameContract } from '../hooks/useGameContract'
import { useGameSocket } from '../hooks/useGameSocket'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useGameState } from '../hooks/useGameState'
import { useToast } from '../hooks/useToast'
import { useRenderLoop } from '../hooks/useRenderLoop'
import { useInputHandling } from '../hooks/useInputHandling'

interface GameProps {
  settings: GameSettingsConfig
  onReset?: () => void
  onExit?: () => void
}

export default function Game({ settings, onReset, onExit }: GameProps) {
  const { address } = useAccount()
  const [interactionMode, setInteractionMode] = useState<'camera' | 'pull'>('camera')

  // Contract Hooks
  const {
    gameStateData,
    joinGame: contractJoin,
    reload: contractReload,
    isPending,
    isConfirming
  } = useGameContract()

  // WebSocket Hook
  const {
    socket,
    gameState: serverState,
    isConnected,
    physicsState,
    submitMove,
    joinGame,
    timeLeft: serverTimeLeft,
    authSignature,
    signAndConnect
  } = useGameSocket(settings)

  // Leaderboard Hook
  const {
    submitScore,
    highScore,
    rank,
    totalPlayers,
    topScores,
    isPending: isSubmitting,
    isConfirming: isConfirmingScore,
    isConfirmed: isScoreConfirmed,
    hash: scoreHash,
    refetchAll: refetchLeaderboard
  } = useLeaderboard(settings.difficulty)

  // Toast notifications
  const { toasts, addToast, dismissToast } = useToast()

  // Centralized game state
  const { state, actions, isActive, isEnded, players, currentPlayerId, isCurrentPlayer, isSpectator } = useGameState(settings, serverState, serverTimeLeft, address)

  // Auth: Auto-trigger signing for Multiplayer
  useEffect(() => {
    if (settings.gameMode === 'MULTIPLAYER' && !authSignature) {
      signAndConnect();
    }
  }, [settings.gameMode, authSignature, signAndConnect]);

  // Derived State from Server and Game Mode
  const gameState: GameState = (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR')
    ? 'ACTIVE'
    : (serverState?.status as GameState || 'WAITING')

  // Keep refs in sync with centralized state
  const containerRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<any>(null)
  const gameOverRef = useRef(state.gameOver)
  const showRulesRef = useRef(state.showRules)
  const showHelpersRef = useRef(state.showHelpers)
  const blocksRef = useRef<any[]>([])
  const dragStartRef = useRef<any>(null)
  const sceneRef = useRef<any>(null)
  const scoredBlocksRef = useRef<Set<number>>(new Set())
  const workerCheckTimeouts = useRef<Set<NodeJS.Timeout>>(new Set())
  const sceneUpdateListenerRef = useRef<any>(null)
  const initRetryCount = useRef<number>(0)
  const hoveredBlockRef = useRef<any>(null)
  const wobbleRef = useRef<WobbleState | null>(null)
  const orbitControlsRef = useRef<any>(null)
  const interactionModeRef = useRef<'camera' | 'pull'>(interactionMode)
  const lastTimerWarningRef = useRef<number>(0)
  const lastTimerTickRef = useRef<number>(0)
  const aiTurnRef = useRef(false)
  const eventHandlersRef = useRef<{
    handleMouseMove: ((evt: MouseEvent) => void) | null
    handleInputStart: ((evt: MouseEvent | TouchEvent) => void) | null
    handleInputMove: ((evt: MouseEvent | TouchEvent) => void) | null
    handleInputEnd: ((evt: MouseEvent | TouchEvent) => void) | null
  }>({
    handleMouseMove: null,
    handleInputStart: null,
    handleInputMove: null,
    handleInputEnd: null
  })

  useEffect(() => { gameOverRef.current = state.gameOver }, [state.gameOver])
  useEffect(() => { showRulesRef.current = state.showRules }, [state.showRules])
  useEffect(() => { showHelpersRef.current = state.showHelpers }, [state.showHelpers])
  useEffect(() => { socketRef.current = socket }, [socket])
  useEffect(() => { interactionModeRef.current = interactionMode }, [interactionMode])
  useEffect(() => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.enabled = interactionMode === 'camera'
    }

    const engine = engineRef.current
    if (!engine?.renderer?.domElement) return

    if (interactionMode === 'camera') {
      engine.renderer.domElement.style.cursor = 'grab'
      if (engine.interaction.selectedBlock) {
        const block = engine.interaction.selectedBlock
        if (block.material && block.userData.originalEmissive !== undefined) {
          block.material.emissive = new THREE.Color(block.userData.originalEmissive)
          block.material.emissiveIntensity = 0
          delete block.userData.originalEmissive
        }
      }
      engine.interaction.selectedBlock = null
      dragStartRef.current = null
      actions.setDragIndicator(null)
    } else {
      engine.renderer.domElement.style.cursor = 'default'
    }
  }, [interactionMode, actions.setDragIndicator])

  // Sync Contract Data
  useEffect(() => {
    if (gameStateData) {
      console.log('Contract State:', gameStateData)
    }
  }, [gameStateData])

  // Sync multiplayer physics state
  useEffect(() => {
    if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') return
    if (!physicsState || blocksRef.current.length === 0) return
    const count = Math.min(blocksRef.current.length, physicsState.length)
    for (let i = 0; i < count; i++) {
      const b = blocksRef.current[i]
      const s = physicsState[i]
      b.position.set(s.position.x, s.position.y, s.position.z)
      if (b.quaternion && s.quaternion) {
        b.quaternion.set(s.quaternion.x, s.quaternion.y, s.quaternion.z, s.quaternion.w)
      }
      b.__dirtyPosition = true
      b.__dirtyRotation = true
    }
  }, [physicsState, settings.gameMode])

  // Engine Refs to persist Three.js objects across renders
  const engineRef = useRef<{
    renderer: any
    camera: any
    materials: {
      table: any
      block: any
      block2: any
      lockedBlock: any
    }
    interaction: {
      plane: any
      selectedBlock: any
      mousePos: any
      offset: any
    }
    lastPhysicsUpdate: number
  }>({
    renderer: null,
    camera: null,
    materials: { table: null, block: null, block2: null, lockedBlock: null },
    interaction: {
      plane: null,
      selectedBlock: null,
      mousePos: null,
      offset: null
    },
    lastPhysicsUpdate: 0
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const init = async () => {
      try {
        if (!window.THREE) await loadScript('/js/three.min.js')
        if (!window.Stats) await loadScript('/js/stats.js')
        if (!window.Physijs) await loadScript('/js/physi.js')
        if (!window.THREE.OrbitControls) await loadScript('/js/OrbitControls.js')

        if (window.Physijs) {
          window.Physijs.scripts.worker = '/js/physijs_worker.js'
          window.Physijs.scripts.ammo = '/js/ammo.js'
        }

        setTimeout(() => initScene(), 50)

        const handleResize = () => {
          const engine = engineRef.current
          if (engine.renderer && engine.camera && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            engine.camera.aspect = rect.width / rect.height
            engine.camera.updateProjectionMatrix()
            engine.renderer.setSize(rect.width, rect.height)
          }
        }
        window.addEventListener('resize', handleResize)
      } catch (error) {
        console.error('Error initializing game:', error)
      }
    }

    init()

    return () => {
      workerCheckTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId))
      workerCheckTimeouts.current.clear()

      if (requestRef.current) cancelAnimationFrame(requestRef.current)

      // Dispose orbit controls
      if (orbitControlsRef.current) {
        orbitControlsRef.current.dispose()
        orbitControlsRef.current = null
      }

      if (sceneRef.current) {
        const scene = sceneRef.current as any
        try {
          if (sceneUpdateListenerRef.current) {
            scene.removeEventListener('update', sceneUpdateListenerRef.current)
            sceneUpdateListenerRef.current = null
          }
          while (sceneRef.current.children.length > 0) {
            sceneRef.current.remove(sceneRef.current.children[0]);
          }
          scene.onSimulationResume = function () { }
        } catch (err) {
          console.warn('[CLEANUP] Error during scene cleanup:', err)
        }
        sceneRef.current = null
      }

      if (engineRef.current.renderer) {
        engineRef.current.renderer.dispose()
        if (engineRef.current.renderer.domElement?.parentNode) {
          engineRef.current.renderer.domElement.parentNode.removeChild(engineRef.current.renderer.domElement)
        }
        engineRef.current.renderer = null
      }

      blocksRef.current = []
      scoredBlocksRef.current.clear()

      // Cleanup event listeners
      cleanupEventHandling()
    }
  }, [settings.gameMode, settings.difficulty])

  const initScene = function () {
    console.log('[INIT] Starting initScene...')
    const engine = engineRef.current
    engine.interaction.mousePos = new THREE.Vector3(0, 0, 0)
    engine.interaction.offset = new THREE.Vector3(0, 0, 0)
    engine.lastPhysicsUpdate = Date.now()

    blocksRef.current = []

    const container = containerRef.current
    if (!container) {
      console.error('[INIT] Container ref not available')
      return
    }

    const containerRect = container.getBoundingClientRect()
    let width = containerRect.width
    let height = containerRect.height

    if (width === 0 || height === 0) {
      let currentElement: HTMLElement | null = container
      let accumulatedHeight = 0
      while (currentElement && currentElement !== document.body) {
        const rect = currentElement.getBoundingClientRect()
        if (rect.height > 0) accumulatedHeight = Math.max(accumulatedHeight, rect.height)
        const computedStyle = window.getComputedStyle(currentElement)
        const explicitHeight = computedStyle.height
        if (explicitHeight && explicitHeight !== 'auto' && explicitHeight !== '0px') {
          const h = parseFloat(explicitHeight)
          if (h > 0) accumulatedHeight = Math.max(accumulatedHeight, h)
        }
        currentElement = currentElement.parentElement
      }
      if (accumulatedHeight === 0) accumulatedHeight = window.innerHeight
      if (width === 0) width = container.parentElement ? container.parentElement.getBoundingClientRect().width : window.innerWidth
      height = accumulatedHeight
    }

    if (width === 0 || height === 0) {
      initRetryCount.current += 1
      if (initRetryCount.current > 50) {
        width = window.innerWidth || 800
        height = window.innerHeight || 600
      } else {
        setTimeout(() => initScene(), 200)
        return
      }
    }
    initRetryCount.current = 0

    engine.renderer = new THREE.WebGLRenderer({ antialias: true })
    engine.renderer.setSize(width, height)
    engine.renderer.setClearColor(0x2c3e50)
    engine.renderer.shadowMap.enabled = true
    engine.renderer.shadowMapSoft = true
    engine.renderer.domElement.style.pointerEvents = 'auto'

    while (container.firstChild) container.removeChild(container.firstChild)
    container.appendChild(engine.renderer.domElement)

    const scene = new Physijs.Scene({ fixedTimeStep: 1 / 120 })
    sceneRef.current = scene
    scene.setGravity(new THREE.Vector3(0, -30, 0))

    const sceneUpdateListener = function () {
      engine.lastPhysicsUpdate = Date.now()

      if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
        scene.simulate()

        if (settings.gameMode === 'SOLO_COMPETITOR' && !gameOverRef.current) {
          blocksRef.current.forEach((block) => {
            const dist = Math.sqrt(block.position.x * block.position.x + block.position.z * block.position.z)

            if (!gameOverRef.current && dist > 10 && !scoredBlocksRef.current.has(block.id)) {
              scoredBlocksRef.current.add(block.id)
              actions.incrementScore()
              addToast({ type: 'success', message: '+1 Block Scored!' })
              if (settings.gameMode === 'SOLO_COMPETITOR') {
                actions.resetTimer()
              }
            }

            if (block.userData?.isLocked && block.position.y < 2) {
              actions.endGame(true)
              gameOverRef.current = true
              addToast({ type: 'error', message: 'Tower Collapsed!' })
              
              // Protocol Labs / IPFS: Capture and persist the collapse state
              actions.captureCollapseState(blocksRef.current).then(cid => {
                if (cid) {
                  addToast({ 
                    type: 'success', 
                    message: `Game state persisted to IPFS: ${cid.substring(0, 10)}...` 
                  })
                }
              })
            }
          })
        }
      }
    }

    sceneUpdateListenerRef.current = sceneUpdateListener
    scene.addEventListener('update', sceneUpdateListener)

    startRenderLoop()

    if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
      const startPhysics = () => {
        if (sceneRef.current) {
          workerCheckTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId))
          workerCheckTimeouts.current.clear()
          sceneRef.current.simulate()
        }
      }

      const checkWorkerReady = () => {
        const s = sceneRef.current as any
        if (s && s._worker) {
          startPhysics()
        } else {
          const timeoutId = setTimeout(checkWorkerReady, 50)
          workerCheckTimeouts.current.add(timeoutId)
        }
      }

      const initialTimeoutId = setTimeout(checkWorkerReady, 100)
      workerCheckTimeouts.current.add(initialTimeoutId)
    }

    engine.camera = new THREE.PerspectiveCamera(35, width / height, 1, 1000)
    engine.camera.position.set(25, 20, 25)
    engine.camera.lookAt(new THREE.Vector3(...ORBIT_CONFIG.TARGET))
    scene.add(engine.camera)

    // Orbit controls
    if (window.THREE.OrbitControls) {
      const controls = new window.THREE.OrbitControls(engine.camera, engine.renderer.domElement)
      controls.target.set(...ORBIT_CONFIG.TARGET)
      controls.minDistance = ORBIT_CONFIG.MIN_DISTANCE
      controls.maxDistance = ORBIT_CONFIG.MAX_DISTANCE
      controls.minPolarAngle = ORBIT_CONFIG.MIN_POLAR
      controls.maxPolarAngle = ORBIT_CONFIG.MAX_POLAR
      controls.enableDamping = true
      controls.dampingFactor = ORBIT_CONFIG.DAMPING_FACTOR
      controls.enabled = interactionMode === 'camera'
      orbitControlsRef.current = controls
    }

    // Lights
    const am_light = new THREE.AmbientLight(0x444444)
    scene.add(am_light)

    const dir_light = new THREE.DirectionalLight(0xFFFFFF)
    dir_light.position.set(20, 30, -5)
    dir_light.target.position.copy(scene.position)
    dir_light.castShadow = true
    dir_light.shadowCameraLeft = -30
    dir_light.shadowCameraTop = -30
    dir_light.shadowCameraRight = 30
    dir_light.shadowCameraBottom = 30
    dir_light.shadowCameraNear = 20
    dir_light.shadowCameraFar = 200
    dir_light.shadowBias = -.001
    dir_light.shadowMapWidth = dir_light.shadowMapHeight = 2048
    dir_light.shadowDarkness = .5
    scene.add(dir_light)

    // Procedural wood textures
    const physicsConfig = getPhysicsConfig(settings.difficulty)

    const woodCanvas = generateWoodTexture({ seed: 42 })
    const woodTexture = new THREE.CanvasTexture(woodCanvas)
    woodTexture.wrapS = woodTexture.wrapT = THREE.RepeatWrapping
    woodTexture.repeat.set(5, 5)

    engine.materials.table = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: woodTexture }),
      physicsConfig.friction,
      physicsConfig.restitution
    )

    const plywoodCanvas = generatePlywoodTexture({ seed: 7 })
    const plywoodTexture = new THREE.CanvasTexture(plywoodCanvas)
    plywoodTexture.wrapS = plywoodTexture.wrapT = THREE.RepeatWrapping
    plywoodTexture.repeat.set(1, .5)

    engine.materials.block = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: plywoodTexture }),
      physicsConfig.friction,
      physicsConfig.restitution
    )

    const plywoodCanvas2 = generatePlywoodTexture({ seed: 13 })
    const plywoodTexture2 = new THREE.CanvasTexture(plywoodCanvas2)
    plywoodTexture2.wrapS = plywoodTexture2.wrapT = THREE.RepeatWrapping
    plywoodTexture2.repeat.set(1, .5)

    engine.materials.block2 = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: plywoodTexture2 }),
      physicsConfig.friction,
      physicsConfig.restitution
    )

    const lockedPlywoodCanvas = generatePlywoodTexture({ seed: 7, baseColor: '#ee9977' })
    const lockedPlywoodTexture = new THREE.CanvasTexture(lockedPlywoodCanvas)
    lockedPlywoodTexture.wrapS = lockedPlywoodTexture.wrapT = THREE.RepeatWrapping
    lockedPlywoodTexture.repeat.set(1, .5)

    engine.materials.lockedBlock = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: lockedPlywoodTexture }),
      physicsConfig.friction,
      physicsConfig.restitution
    )

    // Table
    const table = new Physijs.BoxMesh(
      new THREE.BoxGeometry(50, 1, 50),
      engine.materials.table,
      0,
      { restitution: physicsConfig.restitution, friction: physicsConfig.friction }
    )
    table.position.y = -.5
    table.receiveShadow = true
    scene.add(table)

    createTower()

    engine.interaction.plane = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 150),
      new THREE.MeshBasicMaterial({ opacity: 0, transparent: true })
    )
    engine.interaction.plane.rotation.x = Math.PI / -2
    scene.add(engine.interaction.plane)

    setTimeout(() => initEventHandling(), 0)
  }

  // Render loop hook
  const { requestRef, startRenderLoop, stopRenderLoop } = useRenderLoop({
    engineRef,
    sceneRef,
    blocksRef,
    wobbleRef,
    orbitControlsRef,
    gameOverRef,
    lastTimerTickRef,
    gameMode: settings.gameMode,
    decrementTimer: actions.decrementTimer,
    endGame: actions.endGame,
    addToast,
  })

  // AI move execution (declared early to avoid hoisting issues)
  const executeAIMove = useCallback(() => {
    if (settings.gameMode !== 'SINGLE_VS_AI' || state.gameOver || aiTurnRef.current) return
    aiTurnRef.current = true

    const blocks = blocksRef.current
    const scene = sceneRef.current
    if (!scene || blocks.length === 0) { aiTurnRef.current = false; return }

    const blockStates: BlockState[] = blocks.map(b => ({
      position: { x: b.position.x, y: b.position.y, z: b.position.z },
      rotation: { y: b.rotation.y },
      userData: { layer: b.userData?.layer ?? 0, isLocked: b.userData?.isLocked ?? false },
    }))

    const difficulty: AIDifficulty = settings.difficulty as AIDifficulty
    const delay = getAIMoveDelay(difficulty)

    setTimeout(() => {
      if (gameOverRef.current) { aiTurnRef.current = false; return }

      const move = generateAIMove(blockStates, difficulty, Date.now())
      if (!move || !blocksRef.current[move.blockIndex]) {
        aiTurnRef.current = false
        return
      }

      const block = blocksRef.current[move.blockIndex]
      const force = new THREE.Vector3(move.force.x, move.force.y, move.force.z)

      // Trigger wobble proportional to force
      const forceLen = force.length()
      const wobbleAmplitude = Math.min(0.02, forceLen * 0.0003)
      if (wobbleAmplitude > 0.002) {
        wobbleRef.current = createWobble(wobbleAmplitude)
      }

      if (block.setAngularVelocity) block.setAngularVelocity(new THREE.Vector3(0, 0, 0))
      if (block.setLinearVelocity) block.setLinearVelocity(new THREE.Vector3(0, 0, 0))

      if (typeof block.applyCentralImpulse === 'function') {
        block.applyCentralImpulse(force)
      } else {
        block.applyCentralForce(force)
      }

      addToast({ type: 'info', message: `AI pulled block ${move.blockIndex + 1}` })

      // Let physics settle, then re-enable human input
      setTimeout(() => {
        aiTurnRef.current = false
      }, 500)
    }, delay)
  }, [settings.gameMode, state.gameOver, getAIMoveDelay, addToast, createWobble])

  // Input handling hook
  const { initEventHandling, cleanupEventHandling } = useInputHandling({
    engineRef,
    blocksRef,
    orbitControlsRef,
    hoveredBlockRef,
    dragStartRef,
    wobbleRef,
    socketRef,
    eventHandlersRef,
    aiTurnRef,
    gameMode: settings.gameMode,
    gameState,
    isSpectator,
    isCurrentPlayer,
    isGameOver: state.gameOver,
    showRulesRef,
    showHelpersRef,
    setShowRules: actions.setShowRules,
    setDragIndicator: actions.setDragIndicator,
    executeAIMove,
    interactionModeRef,
  })

  const createTower = function () {
    const block_length = 6, block_height = 1, block_width = 1.5, block_offset = 2
    const block_geometry = new THREE.BoxGeometry(block_length, block_height, block_width)
    const sc = sceneRef.current
    const engine = engineRef.current

    if (!sc || !engine.materials.block) {
      console.error('Scene or materials not ready, cannot create tower')
      return
    }

    const mats = [engine.materials.block, engine.materials.block2].filter(Boolean)
    const lMat = engine.materials.lockedBlock || engine.materials.block
    const physicsConfig = getPhysicsConfig(settings.difficulty)

    for (let i = 0; i < 16; i++) {
      const isLocked = settings.gameMode === 'SOLO_COMPETITOR' && i >= 14

      for (let j = 0; j < 3; j++) {
        const currentMat = isLocked ? lMat : mats[(i * 3 + j) % mats.length]
        const block = new Physijs.BoxMesh(block_geometry, currentMat, physicsConfig.mass)
        block.position.y = (block_height / 2) + block_height * i
        if (i % 2 === 0) {
          block.rotation.y = Math.PI / 2.01
          block.position.x = block_offset * j - (block_offset * 3 / 2 - block_offset / 2)
        } else {
          block.position.z = block_offset * j - (block_offset * 3 / 2 - block_offset / 2)
        }
        block.receiveShadow = true
        block.castShadow = true
        block.setDamping(physicsConfig.damping, physicsConfig.damping)
        block.userData = { layer: i, isLocked }
        sc.add(block)
        blocksRef.current.push(block)
      }
    }
  }

  const resetTower = function () {
    const sc = sceneRef.current
    const engine = engineRef.current
    if (!sc) return

    for (let i = 0; i < blocksRef.current.length; i++) {
      sc.remove(blocksRef.current[i])
    }
    blocksRef.current.length = 0
    engine.interaction.selectedBlock = null
    createTower()

    actions.resetGame()
    gameOverRef.current = false
    scoredBlocksRef.current.clear()
    wobbleRef.current = null

    if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
      sc.simulate()
    }
  }

  // Timer effect for SOLO_COMPETITOR - decrement handled in render loop via actions.decrementTimer
  // This effect handles the timer warning toast
  useEffect(() => {
    if (settings.gameMode !== 'SOLO_COMPETITOR') return
    if (state.timeLeft === 8 && state.timeLeft !== lastTimerWarningRef.current) {
      addToast({ type: 'warning', message: '8 seconds left!' })
      lastTimerWarningRef.current = state.timeLeft
    }
    if (state.timeLeft <= 6) lastTimerWarningRef.current = 0
  }, [state.timeLeft, settings.gameMode])

  // Timer handled in render loop for solo, serverTimeLeft for multiplayer
  const timeLeft = state.timeLeft

  return (
    <div className="relative w-full h-full game-container">
      {/* Game UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <GameUI
          state={state}
          players={players}
          currentPlayerId={currentPlayerId}
          maxPlayers={settings.gameMode === 'MULTIPLAYER' ? settings.playerCount :
            settings.gameMode === 'SINGLE_VS_AI' ? (settings.aiOpponentCount || 1) + 1 : 1}
          difficulty={settings.difficulty}
          stake={settings.stake}
          gameMode={settings.gameMode}
          highScore={highScore}
          onJoin={() => {
            if (settings.gameMode === 'MULTIPLAYER') {
              joinGame()
            } else {
              try { contractJoin() } catch (e) { console.error(e) }
            }
          }}
          onReload={() => {
            if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
              resetTower()
            } else {
              contractReload()
              actions.setPotSize(prev => (prev as number) + 1)
            }
          }}
          onVote={(split) => {
            alert(`Voted to ${split ? 'Split' : 'Continue'}`)
          }}
          onExit={onExit}
          setShowRules={actions.setShowRules}
          setShowHelpers={actions.setShowHelpers}
          interactionMode={interactionMode}
          onSetInteractionMode={setInteractionMode}
        />
      </div>

      {/* Game Over Overlay */}
      {state.gameOver && (
        <GameOver
          survivors={settings.gameMode === 'SOLO_COMPETITOR' ?
            [{ address: 'You', isWinner: true }] :
            state.survivors
          }
          status={state.towerCollapsed ? 'COLLAPSED' : 'ENDED'}
          activePlayers={settings.gameMode === 'MULTIPLAYER' ? serverState?.activePlayers || [] : []}
          userAddress={address}
          potSize={state.potSize}
          onExit={onExit}
          mode={settings.gameMode === 'SOLO_COMPETITOR' ? 'SOLO_COMPETITOR' :
            settings.gameMode === 'SOLO_PRACTICE' ? 'SOLO_PRACTICE' : 'MULTIPLAYER'}
          score={state.score}
          highScore={highScore}
          rank={rank}
          totalPlayers={totalPlayers}
          topScores={topScores || []}
          onPlayAgain={settings.gameMode === 'SOLO_COMPETITOR' || settings.gameMode === 'SOLO_PRACTICE' ? resetTower : undefined}
          isPending={isSubmitting}
          isConfirming={isConfirmingScore}
          isConfirmed={isScoreConfirmed}
          onSubmitScore={address ? () => submitScore(settings.difficulty, state.score) : undefined}
          collapseCid={state.collapseCid}
        />
      )}

      {/* Spectator Overlay */}
      {settings.gameMode === 'MULTIPLAYER' && isSpectator && !state.gameOver && (
        <SpectatorOverlay
          currentPlayer={serverState?.currentPlayer || null}
          players={players}
          timeLeft={timeLeft}
          isCollapsed={state.towerCollapsed}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Transaction Status Indicator */}
      {(isPending || isConfirming) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg animate-pulse">
          {isPending ? 'Check Wallet...' : 'Confirming Transaction...'}
        </div>
      )}

      {gameState === 'ACTIVE' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-black/55 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 text-xs md:text-sm text-white/90 shadow-lg">
            {interactionMode === 'camera'
              ? 'Camera mode active — switch to Pull Block to remove a piece'
              : 'Pull Block mode active — camera locked while you drag'}
          </div>
        </div>
      )}

      {/* Drag Indicator Overlay */}
      {state.dragIndicator && (
        <div
          className="absolute pointer-events-none z-40"
          style={{
            left: `${state.dragIndicator.x}px`,
            top: `${state.dragIndicator.y}px`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <div
            className="relative"
            style={{
              width: `${Math.min(state.dragIndicator.length, 150)}px`,
              height: '4px',
              background: 'linear-gradient(90deg, rgba(34,197,94,0.8) 0%, rgba(34,197,94,0.3) 100%)',
              transform: `rotate(${-state.dragIndicator.angle}deg)`,
              transformOrigin: 'left center',
              borderRadius: '2px',
              boxShadow: '0 0 10px rgba(34,197,94,0.5)'
            }}
          >
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2"
              style={{
                width: 0,
                height: 0,
                borderLeft: '12px solid rgba(34,197,94,0.8)',
                borderTop: '8px solid transparent',
                borderBottom: '8px solid transparent',
                filter: 'drop-shadow(0 0 4px rgba(34,197,94,0.6))'
              }}
            />
          </div>
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded whitespace-nowrap backdrop-blur-sm">
            {Math.round(Math.min(state.dragIndicator.length / 3, 50))}% Power
          </div>
        </div>
      )}

      {/* Game Canvas Container */}
      <div
        ref={containerRef}
        className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black overflow-hidden"
        style={{
          pointerEvents: 'auto',
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          zIndex: 0
        }}
      />
    </div>
  )
}
