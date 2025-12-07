'use client'

import React, { useEffect, useRef } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { GameSettingsConfig } from './GameSettings'
import { loadScript, getPhysicsConfig } from './Game/physicsHelpers'

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

import GameUI, { type GameState, Player } from './GameUI'
import GameOver from './MultiplayerGameOver'
import SpectatorOverlay from './SpectatorOverlay'

import { useGameContract } from '../hooks/useGameContract'
import { useGameSocket } from '../hooks/useGameSocket'
import { useLeaderboard } from '../hooks/useLeaderboard'

interface GameProps {
  settings: GameSettingsConfig
  onReset?: () => void
  onExit?: () => void
}

export default function Game({ settings, onReset, onExit }: GameProps) {
  const { address } = useAccount()

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

  // Leaderboard Hook - Pass difficulty for correct high score fetching
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

  // Handle different game modes
  const players = React.useMemo(() => {
    if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
      return [{
        id: 'solo-player',
        address: 'You',
        isAlive: true,
        isCurrentTurn: true
      }]
    } else if (settings.gameMode === 'SINGLE_VS_AI') {
      const aiPlayers = Array.from({ length: settings.aiOpponentCount || 1 }, (_, i) => ({
        id: `ai-${i}`,
        address: `AI ${i + 1}`,
        isAlive: true,
        isCurrentTurn: false // Will be handled by server
      }))
      return [{
        id: 'human-player',
        address: 'You',
        isAlive: true,
        isCurrentTurn: true
      }, ...aiPlayers]
    } else {
      // MULTIPLAYER
      return serverState?.players.map((addr: string) => ({
        id: addr,
        address: addr,
        isAlive: true, // TODO: Add to server state
        isCurrentTurn: addr === serverState.currentPlayer
      })) || []
    }
  }, [settings, serverState])

  const currentPlayerId = (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR')
    ? 'solo-player'
    : settings.gameMode === 'SINGLE_VS_AI'
      ? 'human-player'
      : serverState?.currentPlayer || undefined

  // Local Visual State
  const [potSize, setPotSize] = React.useState(0)
  const [fallenCount, setFallenCount] = React.useState(0)
  const [score, setScore] = React.useState(0)
  const [gameOver, setGameOver] = React.useState(false)
  const [gameWon, setGameWon] = React.useState(false)
  const [hasJoinedGame, setHasJoinedGame] = React.useState(false)
  const [survivors, setSurvivors] = React.useState<Array<{ address: string, isWinner: boolean }>>([])
  const [towerCollapsed, setTowerCollapsed] = React.useState(false)
  // Auto-show rules for solo modes
  const [showRules, setShowRules] = React.useState(
    settings.gameMode === 'SOLO_COMPETITOR' || settings.gameMode === 'SOLO_PRACTICE'
  )
  // Drag indicator state for mobile feedback
  const [dragIndicator, setDragIndicator] = React.useState<{ x: number, y: number, length: number, angle: number } | null>(null)
  // Visual Helpers State
  const [showHelpers, setShowHelpers] = React.useState(settings.showHelpers)


  // Multiplayer timer (from server) or solo timer
  const timeLeft = settings.gameMode === 'MULTIPLAYER' ? serverTimeLeft : (
    settings.gameMode === 'SOLO_COMPETITOR' ? undefined : 30
  )

  // Determine if this client is current player (using address, not socket ID)
  const userAddress = address?.toLowerCase()
  const isCurrentPlayer = settings.gameMode === 'MULTIPLAYER'
    ? serverState?.currentPlayer?.toLowerCase() === userAddress
    : true // Solo modes are always "current"

  // Spectator check: in multiplayer, you're spectator if game is active but not your turn
  const isSpectator = settings.gameMode === 'MULTIPLAYER' && serverState?.status === 'ACTIVE' && !isCurrentPlayer

  // Sync Contract Data
  useEffect(() => {
    if (gameStateData) {
      console.log('Contract State:', gameStateData)
    }
  }, [gameStateData])

  // Handle Multiplayer Game End States
  useEffect(() => {
    if (settings.gameMode !== 'MULTIPLAYER' || !serverState) return

    // Handle tower collapse
    if (serverState.status === 'COLLAPSED') {
      setTowerCollapsed(true)
      // Determine survivors (players in activePlayers array)
      const survivorList = serverState.activePlayers?.map(addr => ({
        address: addr,
        isWinner: false // Will be set below
      })) || []

      // Last survivor is the winner
      if (survivorList.length > 0) {
        survivorList[0].isWinner = true
      }

      setSurvivors(survivorList)
      setGameOver(true)
    }

    // Handle natural game end (only 1 player left)
    if (serverState.status === 'ENDED') {
      setGameOver(true)
      const survivorList = serverState.activePlayers?.map(addr => ({
        address: addr,
        isWinner: true // All remaining players won
      })) || []
      setSurvivors(survivorList)
    }
  }, [serverState?.status, serverState?.activePlayers, settings.gameMode])

  // Timer Logic - Only for SOLO_COMPETITOR mode (multiplayer uses server timer)
  useEffect(() => {
    let interval: NodeJS.Timeout
    // Timer is ONLY enabled for SOLO_COMPETITOR mode
    if (settings.gameMode === 'SOLO_COMPETITOR' && gameState === 'ACTIVE' && !gameOver && !gameWon && !showRules) {
      interval = setInterval(() => {
        // Note: timeLeft is derived from server in multiplayer, set internally in solo
        // This is managed in Game.tsx local state for SOLO_COMPETITOR
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [gameState, gameOver, gameWon, settings.gameMode, showRules])

  const containerRef = useRef<HTMLDivElement>(null)
  const socketRef = useRef<any>(null)
  const gameOverRef = useRef(false)
  const showRulesRef = useRef(showRules)
  const showHelpersRef = useRef(showHelpers)

  useEffect(() => {
    showRulesRef.current = showRules
  }, [showRules])

  useEffect(() => {
    showHelpersRef.current = showHelpers
  }, [showHelpers])

  const blocksRef = useRef<any[]>([])
  const dragStartRef = useRef<any>(null)
  const sceneRef = useRef<any>(null)
  const initializedRef = useRef<boolean>(false)
  const scoredBlocksRef = useRef<Set<number>>(new Set())
  const requestRef = useRef<number | undefined>(undefined)
  const workerCheckTimeouts = useRef<Set<NodeJS.Timeout>>(new Set())
  const sceneUpdateListenerRef = useRef<any>(null)
  const initRetryCount = useRef<number>(0)

  useEffect(() => {
    socketRef.current = socket
  }, [socket])

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

  useEffect(() => {
    if (typeof window === 'undefined') return

    const init = async () => {
      // Remove the initializedRef guard - let React's useEffect handle this
      // console.log('[INIT] Initializing game...') // Removed debug log

      // Load required scripts (only if not already loaded)
      try {
        // Load Three.js first
        if (!window.THREE) {
          await loadScript('/js/three.min.js')
        }

        // Load Stats.js
        if (!window.Stats) {
          await loadScript('/js/stats.js')
        }

        // Load Physijs
        if (!window.Physijs) {
          await loadScript('/js/physi.js')
        }

        // Set physijs configurations
        if (window.Physijs) {
          window.Physijs.scripts.worker = '/js/physijs_worker.js'
          window.Physijs.scripts.ammo = '/js/ammo.js'
        } else {
          console.error('Physijs is not available')
        }

        // Initialize the scene with a small delay to ensure DOM is ready
        setTimeout(() => initScene(), 50)

        // Handle window resize
        const handleResize = () => {
          const engine = engineRef.current
          if (engine.renderer && engine.camera && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect()
            const width = rect.width
            const height = rect.height

            engine.camera.aspect = width / height
            engine.camera.updateProjectionMatrix()
            engine.renderer.setSize(width, height)
          }
        }

        window.addEventListener('resize', handleResize)
      } catch (error) {
        console.error('Error initializing game:', error)
        return
      }
    }

    init()

    // Main cleanup function - runs when component unmounts or dependencies change
    return () => {
      // Clear all pending worker check timeouts
      workerCheckTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId))
      workerCheckTimeouts.current.clear()

      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current)
      }

      // Cleanup Scene
      if (sceneRef.current) {
        // console.log('[CLEANUP] Cleaning up Physijs scene') // Removed debug log
        const scene = sceneRef.current as any

        try {
          // CRITICAL: Remove the update event listener FIRST
          if (sceneUpdateListenerRef.current) {
            // console.log('[CLEANUP] Removing scene update listener') // Removed debug log
            scene.removeEventListener('update', sceneUpdateListenerRef.current)
            sceneUpdateListenerRef.current = null
          }

          // Remove all objects from scene
          // console.log('[CLEANUP] Removing scene objects...') // Removed debug log
          while (sceneRef.current.children.length > 0) {
            sceneRef.current.remove(sceneRef.current.children[0]);
          }

          // Stop simulation
          scene.onSimulationResume = function () { }

          // DON'T terminate the worker - let Physijs manage it
          // Terminating it corrupts Physijs's global state
          // console.log('[CLEANUP] Leaving worker alive for Physijs to manage') // Removed debug log
        } catch (err) {
          console.warn('[CLEANUP] Error during scene cleanup:', err)
        }

        sceneRef.current = null
      }

      if (engineRef.current.renderer) {
        engineRef.current.renderer.dispose()
        if (engineRef.current.renderer.domElement && engineRef.current.renderer.domElement.parentNode) {
          engineRef.current.renderer.domElement.parentNode.removeChild(engineRef.current.renderer.domElement)
        }
        engineRef.current.renderer = null
      }

      // Reset refs
      blocksRef.current = []
      scoredBlocksRef.current.clear()
    }
  }, [settings.gameMode, settings.difficulty]) // Re-init when gameMode or difficulty changes

  // Engine Refs to persist Three.js objects across renders
  const engineRef = useRef<{
    renderer: any
    camera: any
    materials: {
      table: any
      block: any
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
    materials: { table: null, block: null, lockedBlock: null },
    interaction: {
      plane: null,
      selectedBlock: null,
      mousePos: null, // Will init in initScene
      offset: null
    },
    lastPhysicsUpdate: 0
  })

  const initScene = function () {
    console.log('[INIT] Starting initScene...')
    const engine = engineRef.current
    engine.interaction.mousePos = new THREE.Vector3(0, 0, 0)
    engine.interaction.offset = new THREE.Vector3(0, 0, 0)
    engine.lastPhysicsUpdate = Date.now()

    // Reset blocks
    blocksRef.current = []

    // Get the actual container dimensions
    const container = containerRef.current
    if (!container) {
      console.error('[INIT] Container ref not available')
      return
    }

    // Force a reflow and get dimensions with fallbacks
    const containerRect = container.getBoundingClientRect()
    let width = containerRect.width
    let height = containerRect.height

    // Fallback: if dimensions are zero, try to calculate from parent
    if (width === 0 || height === 0) {
      console.warn('[INIT] Container has zero dimensions, trying fallback calculation...')
      
      // Try to get dimensions from offset parent
      let currentElement: HTMLElement | null = container
      let accumulatedHeight = 0
      
      while (currentElement && currentElement !== document.body) {
        const rect = currentElement.getBoundingClientRect()
        const computedStyle = window.getComputedStyle(currentElement)
        
        if (rect.height > 0) {
          accumulatedHeight = Math.max(accumulatedHeight, rect.height)
        }
        
        // Check for explicit height in computed style
        const explicitHeight = computedStyle.height
        if (explicitHeight && explicitHeight !== 'auto' && explicitHeight !== '0px') {
          const heightValue = parseFloat(explicitHeight)
          if (heightValue > 0) {
            accumulatedHeight = Math.max(accumulatedHeight, heightValue)
          }
        }
        
        currentElement = currentElement.parentElement
      }
      
      // Use viewport height as final fallback
      if (accumulatedHeight === 0) {
        accumulatedHeight = window.innerHeight
      }
      
      // Also try to get width from parent or viewport
      if (width === 0) {
        width = container.parentElement ? container.parentElement.getBoundingClientRect().width : window.innerWidth
      }
      
      height = accumulatedHeight
      
      console.log('[INIT] Fallback dimensions calculated:', width, 'x', height)
    }

    console.log('[INIT] Container dimensions:', width, 'x', height, containerRect)

    // Ensure container has proper dimensions with reasonable defaults
    if (width === 0 || height === 0) {
      initRetryCount.current += 1
      console.error(`[INIT] Still have zero dimensions after fallback (attempt ${initRetryCount.current}), retrying in 200ms...`)
      
      // Add maximum retry limit to prevent infinite loops
      if (initRetryCount.current > 50) {
        console.error('[INIT] Maximum retry limit reached. Using emergency fallback dimensions.')
        width = window.innerWidth || 800
        height = window.innerHeight || 600
      } else {
        setTimeout(() => initScene(), 200)
        return
      }
    }

    // Reset retry counter on successful initialization
    initRetryCount.current = 0

    engine.renderer = new THREE.WebGLRenderer({ antialias: true })
    engine.renderer.setSize(width, height)
    engine.renderer.setClearColor(0x2c3e50)
    engine.renderer.shadowMap.enabled = true
    engine.renderer.shadowMapSoft = true
    // Ensure the canvas can receive mouse events
    engine.renderer.domElement.style.pointerEvents = 'auto'

    // Ensure only one canvas
    while (container.firstChild) {
      container.removeChild(container.firstChild)
    }
    container.appendChild(engine.renderer.domElement)

    const scene = new Physijs.Scene({ fixedTimeStep: 1 / 120 })
    sceneRef.current = scene
    scene.setGravity(new THREE.Vector3(0, -30, 0))

    // Store the listener so we can remove it later
    const sceneUpdateListener = function () {
      engine.lastPhysicsUpdate = Date.now()

      // For solo practice mode, we handle local physics
      // For server modes, we rely on server updates
      if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
        // Continue local physics simulation
        scene.simulate()

        // Competitor Mode Logic: Scoring and Collapse
        if (settings.gameMode === 'SOLO_COMPETITOR' && !gameOverRef.current) {
          blocksRef.current.forEach((block) => {
            // Check Scoring: Block moved far from center (removed from tower)
            const dist = Math.sqrt(block.position.x * block.position.x + block.position.z * block.position.z)

            // Only update score if game is NOT over
            if (!gameOverRef.current && dist > 10 && !scoredBlocksRef.current.has(block.id)) {
              scoredBlocksRef.current.add(block.id)
              setScore(prev => prev + 1)
              // Note: Timer is managed by server in multiplayer, client in solo modes
            }

            // Check Collapse:
            // Only trigger if a locked (top) block has fallen significantly (e.g., near the table)
            if (block.userData?.isLocked && block.position.y < 2) {
              setGameOver(true)
              gameOverRef.current = true
            }
          })
        }
      }
    }

    sceneUpdateListenerRef.current = sceneUpdateListener
    scene.addEventListener('update', sceneUpdateListener)
    // console.log('[INIT] Scene update event listener registered') // Removed debug log

    // Start Render Loop
    requestAnimationFrame(render)

    // Enable physics simulation based on game mode - ONLY after worker is ready
    if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
      // console.log('[INIT] Waiting for Physijs worker to be ready...') // Removed debug log

      // Wait for worker to be ready before starting simulation
      const startPhysics = () => {
        if (sceneRef.current) {
          // Clear all pending checks since we're now starting
          workerCheckTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId))
          workerCheckTimeouts.current.clear()
          sceneRef.current.simulate()
        }
      }

      // Check if worker is ready, if not, wait for it
      const checkWorkerReady = () => {
        const s = sceneRef.current as any
        if (s && s._worker) {
          startPhysics()
        } else {
          const timeoutId = setTimeout(checkWorkerReady, 50)
          workerCheckTimeouts.current.add(timeoutId)
        }
      }

      // Give the scene a moment to create its worker
      const initialTimeoutId = setTimeout(checkWorkerReady, 100)
      workerCheckTimeouts.current.add(initialTimeoutId)
    }

    engine.camera = new THREE.PerspectiveCamera(
      35,
      width / height,
      1,
      1000
    )
    engine.camera.position.set(25, 20, 25)
    engine.camera.lookAt(new THREE.Vector3(0, 7, 0))
    scene.add(engine.camera)

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

    // Loader
    const loader = new THREE.TextureLoader()

    const physicsConfig = getPhysicsConfig(settings.difficulty)

    // Materials
    const woodTexture = loader.load('/images/wood.jpg', undefined, undefined, (err: any) => {
      console.error('Error loading wood texture:', err)
    })

    engine.materials.table = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: woodTexture }),
      physicsConfig.friction, // friction
      physicsConfig.restitution // restitution
    )
    engine.materials.table.map.wrapS = engine.materials.table.map.wrapT = THREE.RepeatWrapping
    engine.materials.table.map.repeat.set(5, 5)

    const plywoodTexture = loader.load('/images/plywood.jpg', undefined, undefined, (err: any) => {
      console.error('Error loading plywood texture:', err)
    })

    // Standard Block Material
    engine.materials.block = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: plywoodTexture }),
      physicsConfig.friction,
      physicsConfig.restitution
    )
    engine.materials.block.map.wrapS = engine.materials.block.map.wrapT = THREE.RepeatWrapping
    engine.materials.block.map.repeat.set(1, .5)

    // Locked Block Material (Darker/Reddish) for top layers
    engine.materials.lockedBlock = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: plywoodTexture, color: 0xffaaaa }), // Red tint
      physicsConfig.friction,
      physicsConfig.restitution
    )
    engine.materials.lockedBlock.map.wrapS = engine.materials.lockedBlock.map.wrapT = THREE.RepeatWrapping
    engine.materials.lockedBlock.map.repeat.set(1, .5)

    // Table
    const table = new Physijs.BoxMesh(
      new THREE.BoxGeometry(50, 1, 50),
      engine.materials.table,
      0, // mass
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

    // Wait a tick to ensure the renderer DOM element is available
    setTimeout(() => {
      initEventHandling()
    }, 0)

    // Physics simulation is handled by the update event listener
  }

  const render = function () {
    requestRef.current = requestAnimationFrame(render)
    if (engineRef.current.renderer && sceneRef.current && engineRef.current.camera) {
      engineRef.current.renderer.render(sceneRef.current, engineRef.current.camera)

      // Physics Watchdog
      // If physics hasn't updated in 4 seconds, restart it
      if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
        const now = Date.now()
        if (now - engineRef.current.lastPhysicsUpdate > 4000) {
          console.warn('Physics stalled (>4s), restarting simulation...')
          engineRef.current.lastPhysicsUpdate = now
          sceneRef.current.simulate()
        }
      }
    }
  }

  const createTower = function () {
    const block_length = 6, block_height = 1, block_width = 1.5, block_offset = 2
    const block_geometry = new THREE.BoxGeometry(block_length, block_height, block_width)
    const sc = sceneRef.current
    const engine = engineRef.current

    if (!sc || !engine.materials.block) {
      console.error('Scene or materials not ready, cannot create tower')
      return
    }

    // Use cached materials if not provided (for reset)
    const mat = engine.materials.block
    const lMat = engine.materials.lockedBlock || mat

    const physicsConfig = getPhysicsConfig(settings.difficulty)
    // console.log('Creating tower with physics config:', physicsConfig) // Removed debug log

    for (let i = 0; i < 16; i++) {
      // Determine if this layer is locked (top 2 layers: 14 and 15)
      const isLocked = settings.gameMode === 'SOLO_COMPETITOR' && i >= 14
      const currentMat = isLocked ? lMat : mat

      for (let j = 0; j < 3; j++) {
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

        // Apply damping
        block.setDamping(physicsConfig.damping, physicsConfig.damping)

        // Store layer info for Competitor Mode
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
    setFallenCount(0)
    setScore(0)
    setGameOver(false)
    gameOverRef.current = false
    setGameWon(false)
    scoredBlocksRef.current.clear()

    if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
      sc.simulate()
    }
  }

  const initEventHandling = function () {
    const engine = engineRef.current
    // Check if renderer and its DOM element exist
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

    const handleInputStart = function (evt: MouseEvent | TouchEvent) {
      // Auto-close rules dialog on mobile if user tries to interact
      if (showRulesRef.current) {
        setShowRules(false)
        return
      }

      // Spectator Check - block input if spectating or not your turn
      if (isSpectator || gameState !== 'ACTIVE' || gameOver) return

      // Multiplayer: only allow input during your turn
      if (settings.gameMode === 'MULTIPLAYER' && !isCurrentPlayer) return

      // Prevent default to stop scrolling on touch devices
      if (evt.type === 'touchstart') {
        evt.preventDefault()
      }

      const { clientX, clientY } = getEventPos(evt)
      const rect = engine.renderer.domElement.getBoundingClientRect()
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1
      const ny = -((clientY - rect.top) / rect.height) * 2 + 1

      // Revert to z=1 (far plane) for consistent raycasting
      const vector = new THREE.Vector3(nx, ny, 1)
      vector.unproject(engine.camera)

      const ray = new THREE.Raycaster(engine.camera.position, vector.sub(engine.camera.position).normalize())

      // console.log('Raycasting against', blocksRef.current.length, 'blocks') // Removed debug log
      const intersections = ray.intersectObjects(blocksRef.current)

      if (intersections.length > 0) {
        const block = intersections[0].object
        // console.log('Intersection found:', block.id) // Removed debug log

        // Competitor Mode: Prevent selecting top 2 levels (Layers 14 and 15)
        if (settings.gameMode === 'SOLO_COMPETITOR' && block.userData?.layer >= 14) {
          console.warn('Cannot move blocks from top 2 levels!')
          return
        }

        engine.interaction.selectedBlock = block

        // Visual feedback: Highlight selected block
        if (showHelpersRef.current && block.material) {
          block.userData.originalEmissive = block.material.emissive ? block.material.emissive.getHex() : 0x000000
          block.material.emissive = new THREE.Color(0x00ff00)
          block.material.emissiveIntensity = 0.3
        }

        // Haptic feedback on mobile
        if (evt.type === 'touchstart' && 'vibrate' in navigator) {
          navigator.vibrate(10)
        }

        // Update intersection plane to match block height
        engine.interaction.plane.position.y = engine.interaction.selectedBlock.position.y

        const planeHit = ray.intersectObject(engine.interaction.plane)
        if (planeHit.length > 0) {
          // console.log('Plane hit at', planeHit[0].point) // Removed debug log
          engine.interaction.mousePos.copy(planeHit[0].point)
          dragStartRef.current = planeHit[0].point.clone()
        } else {
          // console.log('Plane hit failed') // Removed debug log
          dragStartRef.current = null
        }
      } else {
        // console.log('No intersection found') // Removed debug log
      }
    }

    const handleInputEnd = function (evt: MouseEvent | TouchEvent) {
      if (engine.interaction.selectedBlock !== null) {
        // console.log('Input End. Selected block:', engine.interaction.selectedBlock.id) // Removed debug log

        // Remove visual highlight
        const block = engine.interaction.selectedBlock
        if (block.material && block.userData.originalEmissive !== undefined) {
          block.material.emissive = new THREE.Color(block.userData.originalEmissive)
          block.material.emissiveIntensity = 0
          delete block.userData.originalEmissive
        }

        const start = dragStartRef.current
        let end = engine.interaction.mousePos.clone()
        if (start) {
          end.y = start.y
        }
        const delta = new THREE.Vector3().copy(end).sub(start || engine.interaction.selectedBlock.position)
        delta.y = 0
        const length = delta.length()
        // console.log('Drag length:', length) // Removed debug log
        const dir = length > 0 ? delta.normalize() : new THREE.Vector3(1, 0, 0)
        const impulse = dir.multiplyScalar(Math.max(5, Math.min(50, length * 10)))

        // Haptic feedback on release (stronger for longer drags)
        if (evt.type === 'touchend' && 'vibrate' in navigator) {
          const vibrationStrength = Math.min(50, Math.max(10, length * 5))
          navigator.vibrate(vibrationStrength)
        }

        const blockIndex = blocksRef.current.indexOf(engine.interaction.selectedBlock)

        if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
          // console.log('Applying impulse:', impulse, 'to block mass:', block.mass) // Removed debug log

          // Attempt to wake up the block
          if (block.setAngularVelocity) block.setAngularVelocity(new THREE.Vector3(0, 0, 0))
          if (block.setLinearVelocity) block.setLinearVelocity(new THREE.Vector3(0, 0, 0))

          if (typeof block.applyCentralImpulse === 'function') {
            block.applyCentralImpulse(impulse)
          } else {
            block.applyCentralForce(impulse)
          }
        } else if (socketRef.current && blockIndex !== -1) {
          socketRef.current.emit('submitMove', {
            blockIndex: blockIndex,
            force: { x: impulse.x, y: impulse.y, z: impulse.z },
            point: { x: engine.interaction.selectedBlock.position.x, y: engine.interaction.selectedBlock.position.y, z: engine.interaction.selectedBlock.position.z }
          })
        }

        engine.interaction.selectedBlock = null
        dragStartRef.current = null
        setDragIndicator(null) // Clear drag indicator
      }
    }

    const handleInputMove = function (evt: MouseEvent | TouchEvent) {
      // Prevent default to stop scrolling on touch devices
      if (evt.type === 'touchmove') {
        evt.preventDefault()
      }

      if (engine.interaction.selectedBlock !== null) {
        // console.log('Input Move. Selected block:', engine.interaction.selectedBlock.id) // Removed debug log
        const { clientX, clientY } = getEventPos(evt)
        const rect = engine.renderer.domElement.getBoundingClientRect()
        const nx = ((clientX - rect.left) / rect.width) * 2 - 1
        const ny = -((clientY - rect.top) / rect.height) * 2 + 1

        const vector = new THREE.Vector3(nx, ny, 1)
        vector.unproject(engine.camera)

        const ray = new THREE.Raycaster(engine.camera.position, vector.sub(engine.camera.position).normalize())

        // Ensure plane is at correct height
        engine.interaction.plane.position.y = engine.interaction.selectedBlock.position.y

        const intersection = ray.intersectObject(engine.interaction.plane)
        if (intersection.length > 0) {
          engine.interaction.mousePos.copy(intersection[0].point)

          // Update drag indicator for visual feedback
          if (showHelpersRef.current && dragStartRef.current) {
            const start = dragStartRef.current
            const end = engine.interaction.mousePos.clone()
            end.y = start.y
            const delta = new THREE.Vector3().copy(end).sub(start)
            delta.y = 0
            const length = delta.length()
            const angle = Math.atan2(delta.z, delta.x) * (180 / Math.PI)

            // Convert 3D position to screen coordinates for overlay
            const screenStart = start.clone().project(engine.camera)
            const screenX = (screenStart.x + 1) / 2 * rect.width
            const screenY = (1 - screenStart.y) / 2 * rect.height

            setDragIndicator({ x: screenX, y: screenY, length: length * 20, angle })
          }
        }
      }
    }

    // Old handleInputEnd removed


    // Mouse events
    engine.renderer.domElement.addEventListener('mousedown', handleInputStart)
    engine.renderer.domElement.addEventListener('mousemove', handleInputMove)
    engine.renderer.domElement.addEventListener('mouseup', handleInputEnd)

    // Touch events
    engine.renderer.domElement.addEventListener('touchstart', handleInputStart, { passive: false })
    engine.renderer.domElement.addEventListener('touchmove', handleInputMove, { passive: false })
    engine.renderer.domElement.addEventListener('touchend', handleInputEnd)
  }

  return (
    <div className="relative w-full h-full game-container">
      {/* Game UI Overlay */}
      <GameUI
        gameState={gameOver ? 'ENDED' : gameState}
        potSize={potSize}
        timeLeft={timeLeft ?? 30}
        players={players}
        currentPlayerId={currentPlayerId}
        fallenCount={fallenCount}
        totalBlocks={16 * 3}
        maxPlayers={settings.gameMode === 'MULTIPLAYER' ? settings.playerCount :
          settings.gameMode === 'SINGLE_VS_AI' ? (settings.aiOpponentCount || 1) + 1 : 1}
        difficulty={settings.difficulty}
        stake={settings.stake}
        isPractice={settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR'}
        score={score}
        highScore={highScore}
        gameMode={settings.gameMode}
        onJoin={() => {
          if (settings.gameMode === 'MULTIPLAYER') {
            joinGame()
            setHasJoinedGame(true)
          } else {
            // Try contract first for other modes
            try {
              contractJoin()
            } catch (e) {
              console.error(e)
            }
          }
        }}
        onReload={() => {
          if (settings.gameMode === 'SOLO_PRACTICE' || settings.gameMode === 'SOLO_COMPETITOR') {
            resetTower()
          } else {
            contractReload()
            setPotSize(prev => prev + 1)
          }
        }}
        onVote={(split) => {
          alert(`Voted to ${split ? 'Split' : 'Continue'}`)
          // TODO: Emit vote to server
        }}
        onExit={onExit}
        showRules={showRules}
        setShowRules={setShowRules}
        showHelpers={showHelpers}
        setShowHelpers={setShowHelpers}
      />

      {/* Game Over Overlay - Unified for all modes */}
      {gameOver && (
        <GameOver
          survivors={settings.gameMode === 'SOLO_COMPETITOR' ? 
            [{ address: 'You', isWinner: true }] : 
            survivors
          }
          status={towerCollapsed ? 'COLLAPSED' : 'ENDED'}
          activePlayers={settings.gameMode === 'MULTIPLAYER' ? serverState?.activePlayers || [] : []}
          userAddress={address}
          potSize={potSize}
          onExit={onExit}
          mode={settings.gameMode === 'SOLO_COMPETITOR' ? 'SOLO_COMPETITOR' : 
                settings.gameMode === 'SOLO_PRACTICE' ? 'SOLO_PRACTICE' : 'MULTIPLAYER'}
          score={score}
          highScore={highScore}
          rank={rank}
          totalPlayers={totalPlayers}
          topScores={topScores || []}
          onPlayAgain={settings.gameMode === 'SOLO_COMPETITOR' || settings.gameMode === 'SOLO_PRACTICE' ? resetTower : undefined}
          isPending={isSubmitting}
          isConfirming={isConfirmingScore}
          isConfirmed={isScoreConfirmed}
          onSubmitScore={address ? () => submitScore(settings.difficulty, score) : undefined}
        />
      )}

      {/* Spectator Overlay (Multiplayer) */}
      {settings.gameMode === 'MULTIPLAYER' && isSpectator && !gameOver && (
        <SpectatorOverlay
          currentPlayer={serverState?.currentPlayer || null}
          players={players}
          timeLeft={timeLeft}
          isCollapsed={towerCollapsed}
        />
      )}




      {/* Transaction Status Indicator */}
      {(isPending || isConfirming) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg animate-pulse">
          {isPending ? 'Check Wallet...' : 'Confirming Transaction...'}
        </div>
      )}

      {/* Drag Indicator Overlay for Mobile Feedback */}
      {dragIndicator && (
        <div
          className="absolute pointer-events-none z-40"
          style={{
            left: `${dragIndicator.x}px`,
            top: `${dragIndicator.y}px`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {/* Drag arrow */}
          <div
            className="relative"
            style={{
              width: `${Math.min(dragIndicator.length, 150)}px`,
              height: '4px',
              background: 'linear-gradient(90deg, rgba(34,197,94,0.8) 0%, rgba(34,197,94,0.3) 100%)',
              transform: `rotate(${-dragIndicator.angle}deg)`,
              transformOrigin: 'left center',
              borderRadius: '2px',
              boxShadow: '0 0 10px rgba(34,197,94,0.5)'
            }}
          >
            {/* Arrowhead */}
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
          {/* Power indicator */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded whitespace-nowrap backdrop-blur-sm">
            {Math.round(Math.min(dragIndicator.length / 3, 50))}% Power
          </div>
        </div>
      )}

      {/* Game Canvas Container */}
      <div 
        ref={containerRef} 
        className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-black overflow-hidden" 
        style={{ 
          pointerEvents: 'auto',
          touchAction: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          // Ensure explicit height is set
          minHeight: '100vh',
          height: '100%',
          // Force height calculation
          maxHeight: '100vh',
          position: 'relative'
        }}
      >
        {/* Canvas will be appended here by initScene */}
      </div>
    </div>
  )
}
