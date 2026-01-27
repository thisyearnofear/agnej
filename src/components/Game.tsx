"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useAccount } from "wagmi";
import { GameSettingsConfig } from "./GameSettings";
import { loadScript } from "./Game/physicsHelpers";
import { 
  TOWER_CONFIG,
  WORLD_CONFIG,
  CAMERA_CONFIG,
  LIGHTING_CONFIG,
  INTERACTION_CONFIG,
  TIMING_CONFIG,
  ASSETS,
  GAME_MODES,
  getPhysicsConfig
} from "@/config";
import { PhysicsEngine, type Vector3 } from "@/lib/physicsEngine";

// External lib declarations
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var Physijs: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var THREE: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var Stats: any;
}

import GameUI from "./GameUI";
import GameOver from "./MultiplayerGameOver";
import SpectatorOverlay from "./SpectatorOverlay";

import { useGameContract } from "../hooks/useGameContract";
import { useGameSocket } from "../hooks/useGameSocket";
import { useLeaderboard } from "../hooks/useLeaderboard";
import { useGameState, type GameStatus } from "../hooks/useGameState";

interface GameProps {
  settings: GameSettingsConfig;
  onReset?: () => void;
  onExit: () => void;
}

export default function Game({ settings, onExit }: GameProps) {
  const { address } = useAccount();
  const [referrer, setReferrer] = useState<string | null>(null);

  // Contract Hooks
  const {
    joinGame: contractJoin,
    reload: contractReload,
    isPending,
    isConfirming,
  } = useGameContract();

  // WebSocket Hook
  const {
    gameState: serverState,
    physicsState,
    joinGame,
    timeLeft: serverTimeLeft,
    socket,
  } = useGameSocket(settings);

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
  } = useLeaderboard(settings.difficulty);

  // Centralized Game State
  const {
    state: gameState,
    actions: gameActions,
    isPractice,
    maxPlayers,
  } = useGameState(settings, serverState, serverTimeLeft);

  // Destructure state for convenience
  const {
    status: gameStatus,
    gameOver,
    towerCollapsed,
    score,
    fallenCount,
    potSize,
    survivors,
    showRules,
    showHelpers,
    dragIndicator,
    timeLeft,
    now,
  } = gameState;

  // Destructure actions for convenience
  const {
    endGame,
    resetGame,
    incrementScore,
    incrementFallen,
    setPotSize,
    setShowRules,
    setShowHelpers,
    setDragIndicator,
    setSurvivors,
    tick,
  } = gameActions;

  // Derived State
  const players = useMemo(() => {
    if (settings.gameMode.startsWith("SOLO"))
      return [
        { id: "solo", address: "You", isAlive: true, isCurrentTurn: true },
      ];
    return (
      serverState?.players.map((addr: string) => ({
        id: addr,
        address: addr,
        isAlive: serverState.activePlayers.includes(addr),
        isCurrentTurn: addr === serverState.currentPlayer,
      })) || []
    );
  }, [settings.gameMode, serverState]);

  const currentPlayerId = useMemo(() => {
    if (settings.gameMode.startsWith("SOLO")) return "solo";
    return serverState?.currentPlayer || undefined;
  }, [settings.gameMode, serverState?.currentPlayer]);

  const userAddress = address?.toLowerCase();
  const isCurrentPlayer = useMemo(
    () =>
      settings.gameMode === "MULTIPLAYER"
        ? serverState?.currentPlayer?.toLowerCase() === userAddress
        : true,
    [settings.gameMode, serverState?.currentPlayer, userAddress],
  );
  const isSpectator = useMemo(
    () =>
      settings.gameMode === "MULTIPLAYER" &&
      serverState?.status === "ACTIVE" &&
      !isCurrentPlayer,
    [settings.gameMode, serverState?.status, isCurrentPlayer],
  );

  const [reconnectionStatus] = useState<
    "connected" | "disconnected" | "reconnecting" | "grace_period"
  >("connected");
  const [gracePeriodEnd] = useState<number | null>(null);
  const [reconnectionAttempts] = useState(0);
  const [isSpectatorMode] = useState(settings.isSpectator || false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [gameMetrics] = useState<any>(undefined);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const gameOverRef = useRef(false);
  const showRulesRef = useRef(showRules);
  const showHelpersRef = useRef(showHelpers);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocksRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dragStartRef = useRef<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sceneRef = useRef<any | null>(null);
  const initializedRef = useRef<boolean>(false);
  const scoredBlocksRef = useRef<Set<number>>(new Set());
  const requestRef = useRef<number | undefined>(undefined);
  const workerCheckTimeouts = useRef<Set<NodeJS.Timeout>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sceneUpdateListenerRef = useRef<((event: any) => void) | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const engineRef = useRef<any>({
    renderer: null,
    camera: null,
    materials: { table: null, block: null, lockedBlock: null },
    interaction: {
      plane: null,
      selectedBlock: null,
      mousePos: null,
      offset: null,
    },
    lastPhysicsUpdate: 0,
  });

  // Sync refs with state
  useEffect(() => {
    showRulesRef.current = showRules;
  }, [showRules]);
  useEffect(() => {
    showHelpersRef.current = showHelpers;
  }, [showHelpers]);
  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  // Logic functions
  const createTower = useCallback(() => {
    console.log("[Game] createTower called");
    const sc = sceneRef.current;
    const e = engineRef.current;
    if (!sc || !e.materials.block) {
      console.error("[Game] Cannot create tower - missing scene or materials");
      return;
    }
    const pc = getPhysicsConfig(settings.difficulty);
    const [bw, bh, bd] = TOWER_CONFIG.BLOCK_SIZE;
    const geom = new THREE.BoxGeometry(bw, bh, bd);
    for (let i = 0; i < TOWER_CONFIG.LAYERS; i++) {
      const isLocked = settings.gameMode === GAME_MODES.SOLO_COMPETITOR.id && 
                       TOWER_CONFIG.LOCKED_LAYERS.includes(i);
      const mat = isLocked ? e.materials.lockedBlock : e.materials.block;
      for (let j = 0; j < TOWER_CONFIG.BLOCKS_PER_LAYER; j++) {
        const b = new Physijs.BoxMesh(geom, mat, pc.mass);
        b.position.y = TOWER_CONFIG.START_Y + i * TOWER_CONFIG.LAYER_HEIGHT;
        if (i % 2 === 0) {
          b.rotation.y = TOWER_CONFIG.LAYER_ROTATION;
          b.position.x = TOWER_CONFIG.BLOCK_SPACING * j - TOWER_CONFIG.BLOCK_SPACING;
        } else {
          b.position.z = TOWER_CONFIG.BLOCK_SPACING * j - TOWER_CONFIG.BLOCK_SPACING;
        }
        b.receiveShadow = b.castShadow = true;
        b.setDamping(pc.damping, pc.damping);
        b.userData = { layer: i, isLocked };
        sc.add(b);
        blocksRef.current.push(b);
      }
    }
    console.log("[Game] Tower created with", blocksRef.current.length, "blocks");
    if (blocksRef.current.length > 0) {
      const firstBlock = blocksRef.current[0];
      console.log("[Game] First block position:", firstBlock.position.x, firstBlock.position.y, firstBlock.position.z);
    }
  }, [settings.gameMode, settings.difficulty]);

  let frameCount = 0;
  const renderFrame = useCallback(
    function animate() {
      requestRef.current = requestAnimationFrame(animate);
      frameCount++;
      if (frameCount === 1) console.log("[Game] First render frame");
      if (frameCount % 60 === 0) console.log("[Game] Render frame", frameCount);
      
      const e = engineRef.current;
      const s = sceneRef.current;
      if (e.renderer && s && e.camera) {
        e.renderer.render(s, e.camera);
        if (settings.gameMode.startsWith("SOLO") && !gameOverRef.current) {
          const t = Date.now();
          if (t - e.lastPhysicsUpdate > 4000) {
            e.lastPhysicsUpdate = t;
            console.log("[Game] Periodic physics simulation");
            s.simulate();
          }
        }
      } else {
        if (frameCount === 1) {
          if (!e.renderer) console.log("[Game] Render: no renderer");
          if (!s) console.log("[Game] Render: no scene");
          if (!e.camera) console.log("[Game] Render: no camera");
        }
      }
    },
    [settings.gameMode],
  );

  const initEventHandling = useCallback(() => {
    const e = engineRef.current;
    if (!e.renderer?.domElement) return () => {};

    const handleStart = (evt: MouseEvent | TouchEvent) => {
      if (showRulesRef.current) {
        setShowRules(false);
        return;
      }
      if (isSpectator || gameStatus !== "ACTIVE" || gameOverRef.current) return;
      if (settings.gameMode === "MULTIPLAYER" && !isCurrentPlayer) return;
      if (evt.type === "touchstart") evt.preventDefault();

      const rect = e.renderer!.domElement.getBoundingClientRect();
      const pos =
        "changedTouches" in evt ? evt.changedTouches[0] : (evt as MouseEvent);
      const v = new THREE.Vector3(
        ((pos.clientX - rect.left) / rect.width) * 2 - 1,
        -((pos.clientY - rect.top) / rect.height) * 2 + 1,
        1,
      );
      v.unproject(e.camera);
      const ray = new THREE.Raycaster(
        e.camera!.position,
        v.sub(e.camera!.position).normalize(),
      );
      const hits = ray.intersectObjects(blocksRef.current);
      if (hits.length > 0) {
        const b = hits[0].object;
        const isLockedLayer = GAME_MODES.SOLO_COMPETITOR.lockedLayers?.includes(b.userData.layer);
        if (settings.gameMode === GAME_MODES.SOLO_COMPETITOR.id && isLockedLayer)
          return;
        e.interaction.selectedBlock = b;
        if (showHelpersRef.current && b.material) {
          b.userData.originalEmissive = b.material.emissive?.getHex() || 0;
          b.material.emissive?.setHex(0x00ff00);
          b.material.emissiveIntensity = 0.3;
        }
        e.interaction.plane!.position.y = b.position.y;
        const hit = ray.intersectObject(e.interaction.plane!);
        if (hit.length > 0) {
          e.interaction.mousePos!.copy(hit[0].point);
          dragStartRef.current = hit[0].point.clone();
        }
      }
    };

    const handleEnd = () => {
      const b = e.interaction.selectedBlock;
      if (b) {
        if (b.material && b.userData.originalEmissive !== undefined) {
          b.material.emissive?.setHex(b.userData.originalEmissive);
          b.material.emissiveIntensity = 0;
        }
        const start = dragStartRef.current;
        const end = e.interaction.mousePos!.clone();
        if (start) end.y = start.y;
        const d = new THREE.Vector3().copy(end).sub(start || b.position);
        d.y = 0;
        const len = d.length();
        const imp = d
          .normalize()
          .multiplyScalar(Math.max(5, Math.min(50, len * 10)));
        if (settings.gameMode.startsWith("SOLO")) {
          b.setAngularVelocity(new THREE.Vector3());
          b.setLinearVelocity(new THREE.Vector3());
          b.applyCentralImpulse(imp);
        } else if (socket) {
          socket.emit("submitMove", {
            blockIndex: blocksRef.current.indexOf(b),
            force: { x: imp.x, y: imp.y, z: imp.z },
            point: { x: b.position.x, y: b.position.y, z: b.position.z },
          });
        }
        e.interaction.selectedBlock = null;
        dragStartRef.current = null;
        setDragIndicator(null);
      }
    };

    const handleMove = (evt: MouseEvent | TouchEvent) => {
      const b = e.interaction.selectedBlock;
      if (b) {
        const rect = e.renderer!.domElement.getBoundingClientRect();
        const pos =
          "changedTouches" in evt ? evt.changedTouches[0] : (evt as MouseEvent);
        const v = new THREE.Vector3(
          ((pos.clientX - rect.left) / rect.width) * 2 - 1,
          -((pos.clientY - rect.top) / rect.height) * 2 + 1,
          1,
        );
        v.unproject(e.camera);
        const ray = new THREE.Raycaster(
          e.camera!.position,
          v.sub(e.camera!.position).normalize(),
        );
        e.interaction.plane!.position.y = b.position.y;
        const hits = ray.intersectObject(e.interaction.plane!);
        if (hits.length > 0) {
          e.interaction.mousePos!.copy(hits[0].point);
          if (showHelpersRef.current && dragStartRef.current) {
            const delta = new THREE.Vector3()
              .copy(hits[0].point)
              .sub(dragStartRef.current);
            delta.y = 0;
            const s = dragStartRef.current.clone().project(e.camera!);
            setDragIndicator({
              x: ((s.x + 1) / 2) * rect.width,
              y: ((1 - s.y) / 2) * rect.height,
              length: delta.length() * 20,
              angle: Math.atan2(delta.z, delta.x) * (180 / Math.PI),
            });
          }
        }
      }
    };

    e.renderer.domElement.addEventListener("mousedown", handleStart);
    e.renderer.domElement.addEventListener("mousemove", handleMove);
    e.renderer.domElement.addEventListener("mouseup", handleEnd);
    e.renderer.domElement.addEventListener("touchstart", handleStart, {
      passive: false,
    });
    e.renderer.domElement.addEventListener("touchmove", handleMove, {
      passive: false,
    });
    e.renderer.domElement.addEventListener("touchend", handleEnd);

    return () => {
      if (e.renderer?.domElement) {
        e.renderer.domElement.removeEventListener("mousedown", handleStart);
        e.renderer.domElement.removeEventListener("mousemove", handleMove);
        e.renderer.domElement.removeEventListener("mouseup", handleEnd);
        e.renderer.domElement.removeEventListener("touchstart", handleStart);
        e.renderer.domElement.removeEventListener("touchmove", handleMove);
        e.renderer.domElement.removeEventListener("touchend", handleEnd);
      }
    };
  }, [gameState, isCurrentPlayer, isSpectator, settings.gameMode, socket]);

  const initScene = useCallback(() => {
    console.log("[Game] initScene called");
    const e = engineRef.current;
    e.interaction.mousePos = new THREE.Vector3();
    e.interaction.offset = new THREE.Vector3();
    e.lastPhysicsUpdate = Date.now();
    blocksRef.current = [];
    const container = containerRef.current;
    if (!container) {
      console.error("[Game] No container ref!");
      return () => {};
    }
    console.log("[Game] Container found, creating renderer...");
    const r = container.getBoundingClientRect();
    e.renderer = new THREE.WebGLRenderer({ antialias: true });
    e.renderer.setSize(
      r.width || window.innerWidth,
      r.height || window.innerHeight,
    );
    e.renderer.setClearColor(0x2c3e50);
    e.renderer.shadowMap.enabled = true;
    container.innerHTML = "";
    container.appendChild(e.renderer.domElement);
    console.log("[Game] Canvas appended:", e.renderer.domElement.tagName, "Size:", e.renderer.domElement.width, "x", e.renderer.domElement.height);

    const s = new Physijs.Scene({ fixedTimeStep: 1 / 120 });
    sceneRef.current = s;
    s.setGravity(new THREE.Vector3(...WORLD_CONFIG.GRAVITY));
    const onUpdate = () => {
      e.lastPhysicsUpdate = Date.now();
      if (settings.gameMode.startsWith("SOLO") && !gameOverRef.current) {
        s.simulate();
        if (settings.gameMode === "SOLO_COMPETITOR") {
          blocksRef.current.forEach((b) => {
            const distSq = b.position.x ** 2 + b.position.z ** 2;
            const scoringRadiusSq = WORLD_CONFIG.SCORING_RADIUS ** 2;
            if (distSq > scoringRadiusSq && !scoredBlocksRef.current.has(b.id)) {
              scoredBlocksRef.current.add(b.id);
              incrementScore(1);
            }
            if (b.userData.isLocked && b.position.y < WORLD_CONFIG.LOCKED_BLOCK_GAME_OVER_Y) {
              endGame(true); // Game over with tower collapsed
            }
          });
        }
      }
    };
    sceneUpdateListenerRef.current = onUpdate;
    s.addEventListener("update", onUpdate);
    requestRef.current = requestAnimationFrame(renderFrame);

    if (settings.gameMode.startsWith("SOLO")) {
      console.log("[Game] Setting up SOLO mode worker check");
      const check = () => {
        console.log("[Game] Worker check running, _worker:", !!s._worker);
        if (s._worker) {
          console.log("[Game] Worker ready, starting simulation");
          s.simulate();
        } else {
          console.log("[Game] Worker not ready yet, retrying...");
          workerCheckTimeouts.current.add(setTimeout(check, 50));
        }
      };
      console.log("[Game] Scheduling first worker check in 100ms");
      const timeoutId = setTimeout(check, 100);
      console.log("[Game] Timeout ID:", timeoutId);
      workerCheckTimeouts.current.add(timeoutId);
    }
    e.camera = new THREE.PerspectiveCamera(
      35,
      (r.width || window.innerWidth) / (r.height || window.innerHeight),
      1,
      1000,
    );
    e.camera.position.set(...CAMERA_CONFIG.POSITION);
    e.camera.lookAt(...CAMERA_CONFIG.LOOK_AT);
    console.log("[Game] Camera position:", CAMERA_CONFIG.POSITION, "looking at:", CAMERA_CONFIG.LOOK_AT);
    s.add(new THREE.AmbientLight(LIGHTING_CONFIG.AMBIENT_COLOR));
    const dl = new THREE.DirectionalLight(LIGHTING_CONFIG.DIRECTIONAL_COLOR);
    dl.position.set(...LIGHTING_CONFIG.DIRECTIONAL_POSITION);
    dl.castShadow = true;
    s.add(dl);
    const loader = new THREE.TextureLoader();
    const pc = getPhysicsConfig(settings.difficulty);
    const wt = loader.load(ASSETS.WOOD_TEXTURE);
    const pt = loader.load(ASSETS.PLYWOOD_TEXTURE);
    e.materials.table = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: wt }),
      pc.friction,
      pc.restitution,
    );
    e.materials.block = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: pt }),
      pc.friction,
      pc.restitution,
    );
    e.materials.lockedBlock = Physijs.createMaterial(
      new THREE.MeshLambertMaterial({ map: pt, color: 0xffaaaa }),
      pc.friction,
      pc.restitution,
    );
    const [tw, th, td] = WORLD_CONFIG.TABLE_SIZE;
    const table = new Physijs.BoxMesh(
      new THREE.BoxGeometry(tw, th, td),
      e.materials.table,
      0,
    );
    table.position.y = WORLD_CONFIG.TABLE_Y;
    table.receiveShadow = true;
    s.add(table);
    console.log("[Game] Creating tower...");
    createTower();
    console.log("[Game] Tower created, setting up interaction plane...");
    e.interaction.plane = new THREE.Mesh(
      new THREE.PlaneGeometry(...WORLD_CONFIG.DRAG_PLANE_SIZE),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    e.interaction.plane.rotation.x = Math.PI / -2;
    s.add(e.interaction.plane);

    console.log("[Game] initScene complete");
    return initEventHandling();
  }, [
    settings.gameMode,
    settings.difficulty,
    createTower,
    renderFrame,
    initEventHandling,
  ]);

  const resetTower = useCallback(() => {
    const sc = sceneRef.current;
    if (!sc) return;
    blocksRef.current.forEach((b) => sc.remove(b));
    blocksRef.current = [];
    engineRef.current.interaction.selectedBlock = null;
    createTower();
    resetGame(); // Use centralized reset
    scoredBlocksRef.current.clear();
    if (settings.gameMode.startsWith("SOLO")) sc.simulate();
  }, [settings.gameMode, createTower]);

  // Referral extraction
  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const r = p.get("ref");
      if (r && r.startsWith("0x")) setReferrer(r);
    }
  }, []);

  useEffect(() => {
    tick();
    const itv = setInterval(() => tick(), 500);
    return () => clearInterval(itv);
  }, [tick]);

  // SOLO_COMPETITOR: countdown timer
  useEffect(() => {
    if (settings.gameMode !== GAME_MODES.SOLO_COMPETITOR.id || gameOver) return;
    
    const timer = setInterval(() => {
      const reachedZero = gameActions.decrementTimer();
      if (reachedZero) {
        endGame(false); // Time's up - game over without collapse
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [settings.gameMode, gameOver, gameActions, endGame]);

  // Main Init Effect
  useEffect(() => {
    console.log("[Game] Main init effect running, initialized:", initializedRef.current, "gameMode:", settings.gameMode);
    if (typeof window === "undefined" || initializedRef.current) {
      console.log("[Game] Skipping init - window:", typeof window, "initialized:", initializedRef.current);
      return;
    }
    initializedRef.current = true;
    console.log("[Game] Initialization starting...");
    let eventCleanup: (() => void) | undefined;
    const initAll = async () => {
      try {
        console.log("[Game] Starting initialization...");
        if (!window.THREE) {
          console.log("[Game] Loading THREE.js...");
          await loadScript(ASSETS.THREE_JS);
        }
        if (!window.Stats) {
          console.log("[Game] Loading Stats.js...");
          await loadScript(ASSETS.STATS_JS);
        }
        if (!window.Physijs) {
          console.log("[Game] Loading Physijs...");
          await loadScript(ASSETS.PHYSI_JS);
        }
        if (window.Physijs) {
          window.Physijs.scripts.worker = ASSETS.PHYSI_WORKER;
          window.Physijs.scripts.ammo = ASSETS.AMMO_JS;
          console.log("[Game] Physijs worker configured");
        }
        console.log("[Game] Calling initScene...");
        eventCleanup = initScene();
        console.log("[Game] initScene completed");
        const resize = () => {
          const e = engineRef.current;
          if (e.renderer && e.camera && containerRef.current) {
            const r = containerRef.current.getBoundingClientRect();
            e.camera.aspect = r.width / r.height;
            e.camera.updateProjectionMatrix();
            e.renderer.setSize(r.width, r.height);
          }
        };
        window.addEventListener("resize", resize);
      } catch (err) {
        console.error("[Game] Init error:", err);
      }
    };
    void initAll();
    const timeouts = workerCheckTimeouts.current;
    const engine = engineRef.current;
    return () => {
      console.log("[Game] Cleanup running, clearing", timeouts.size, "timeouts");
      timeouts.forEach(clearTimeout);
      if (requestRef.current) {
        console.log("[Game] Canceling animation frame:", requestRef.current);
        cancelAnimationFrame(requestRef.current);
      }
      const sc = sceneRef.current;
      if (sc) {
        if (sceneUpdateListenerRef.current)
          sc.removeEventListener("update", sceneUpdateListenerRef.current);
        while (sc.children.length > 0) sc.remove(sc.children[0]);
        sc.onSimulationResume = () => {};
      }
      if (eventCleanup) eventCleanup();
      const rd = engine.renderer;
      if (rd) {
        rd.dispose();
        rd.domElement?.parentNode?.removeChild(rd.domElement);
      }
      console.log("[Game] Cleanup complete, resetting initialized ref");
      initializedRef.current = false;
    };
  }, [initScene]);

  // Physics state sync (multiplayer)
  useEffect(() => {
    if (
      settings.gameMode.startsWith("SOLO") ||
      !physicsState ||
      blocksRef.current.length === 0
    )
      return;
    const count = Math.min(blocksRef.current.length, physicsState.length);
    for (let i = 0; i < count; i++) {
      const b = blocksRef.current[i];
      const s = physicsState[i];
      b.position.set(s.position.x, s.position.y, s.position.z);
      if (b.quaternion && s.quaternion)
        b.quaternion.set(
          s.quaternion.x,
          s.quaternion.y,
          s.quaternion.z,
          s.quaternion.w,
        );
      b.__dirtyPosition = true;
      b.__dirtyRotation = true;
    }
  }, [physicsState, settings.gameMode]);

  // Game End States (multiplayer)
  useEffect(() => {
    if (settings.gameMode !== "MULTIPLAYER" || !serverState) return;
    if (serverState.status === "COLLAPSED") {
      const sl =
        serverState.activePlayers?.map((addr: string) => ({
          address: addr,
          isWinner: false,
        })) || [];
      if (sl.length > 0) sl[0].isWinner = true;
      setSurvivors(sl);
      endGame(true); // Tower collapsed - this also sets towerCollapsed state
    } else if (serverState.status === "ENDED") {
      endGame(false); // Normal end
      const sl =
        serverState.activePlayers?.map((addr: string) => ({
          address: addr,
          isWinner: true,
        })) || [];
      setSurvivors(sl);
    }
  }, [serverState, settings.gameMode, endGame, setSurvivors]);

  return (
    <div className="relative w-full h-full game-container">
      <GameUI
        state={gameState}
        players={players}
        currentPlayerId={currentPlayerId}
        maxPlayers={maxPlayers}
        difficulty={settings.difficulty}
        stake={settings.stake}
        gameMode={settings.gameMode}
        highScore={highScore}
        onJoin={() => {
          if (settings.gameMode === "MULTIPLAYER") joinGame(isSpectatorMode);
          else contractJoin(referrer || undefined);
        }}
        onReload={() => {
          if (settings.gameMode.startsWith("SOLO")) resetTower();
          else {
            void contractReload();
            setPotSize((p: number) => p + 1);
          }
        }}
        onVote={(split) => alert(`Voted to ${split ? "Split" : "Continue"}`)}
        onExit={onExit}
        setShowRules={setShowRules}
        setShowHelpers={setShowHelpers}
      />

      {gameOver && (
        <GameOver
          survivors={
            settings.gameMode === "SOLO_COMPETITOR"
              ? [{ address: "You", isWinner: true }]
              : survivors
          }
          status={towerCollapsed ? "COLLAPSED" : "ENDED"}
          activePlayers={
            settings.gameMode === "MULTIPLAYER"
              ? serverState?.activePlayers || []
              : []
          }
          userAddress={address}
          potSize={potSize}
          onExit={onExit}
          mode={
            settings.gameMode.startsWith("SOLO")
              ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (settings.gameMode as any)
              : "MULTIPLAYER"
          }
          score={score}
          highScore={highScore}
          rank={rank}
          totalPlayers={totalPlayers}
          topScores={topScores || []}
          onPlayAgain={
            settings.gameMode.startsWith("SOLO") ? resetTower : undefined
          }
          isPending={isSubmitting}
          isConfirming={isConfirmingScore}
          isConfirmed={isScoreConfirmed}
          onSubmitScore={
            address ? () => submitScore(settings.difficulty, score) : undefined
          }
          metrics={gameMetrics}
        />
      )}

      {settings.gameMode === "MULTIPLAYER" &&
        (isSpectatorMode || isSpectator) &&
        !gameOver && (
          <SpectatorOverlay
            currentPlayer={serverState?.currentPlayer || null}
            players={players}
            timeLeft={timeLeft}
            isCollapsed={towerCollapsed}
          />
        )}

      {settings.gameMode === "MULTIPLAYER" &&
        reconnectionStatus !== "connected" &&
        !gameOver && (
          <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
            <div className="bg-black/80 backdrop-blur-md border border-yellow-500/30 rounded-2xl p-6 text-center shadow-2xl">
              <div className="text-yellow-400 font-black text-lg mb-3">
                {reconnectionStatus === "disconnected" && "🔌 DISCONNECTED"}
                {reconnectionStatus === "reconnecting" && "🔄 RECONNECTING"}
                {reconnectionStatus === "grace_period" &&
                  "⏰ GRACE PERIOD EXPIRED"}
              </div>
              <div className="text-gray-300 text-sm mb-4">
                {reconnectionStatus === "disconnected" &&
                  `Attempting to reconnect... ${reconnectionAttempts > 0 ? `Attempt ${reconnectionAttempts}/5` : ""}`}
                {reconnectionStatus === "reconnecting" &&
                  `Reconnecting to game... Attempt ${reconnectionAttempts}/5`}
                {reconnectionStatus === "grace_period" &&
                  "Grace period expired. You have been removed from the game."}
              </div>
              {reconnectionStatus === "disconnected" && gracePeriodEnd && (
                <div className="mb-4">
                  <div className="text-xs text-gray-400 mb-1 uppercase">
                    Reconnection Window
                  </div>
                  <div className="w-48 h-2 bg-black/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 transition-all duration-1000"
                      style={{
                        width: `${Math.max(0, Math.min(100, ((gracePeriodEnd - now) / 30000) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-300 mt-1">
                    {Math.ceil(Math.max(0, (gracePeriodEnd - now) / 1000))}{" "}
                    seconds remaining
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      {(isPending || isConfirming) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg animate-pulse">
          {isPending ? "Check Wallet..." : "Confirming Transaction..."}
        </div>
      )}

      {dragIndicator && (
        <div
          className="absolute pointer-events-none z-40"
          style={{
            left: `${dragIndicator.x}px`,
            top: `${dragIndicator.y}px`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className="relative"
            style={{
              width: `${Math.min(dragIndicator.length, 150)}px`,
              height: "4px",
              background:
                "linear-gradient(90deg, rgba(34,197,94,0.8) 0%, rgba(34,197,94,0.3) 100%)",
              transform: `rotate(${-dragIndicator.angle}deg)`,
              transformOrigin: "left center",
              borderRadius: "2px",
              boxShadow: "0 0 10px rgba(34,197,94,0.5)",
            }}
          >
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2"
              style={{
                width: 0,
                height: 0,
                borderLeft: "12px solid rgba(34,197,94,0.8)",
                borderTop: "8px solid transparent",
                borderBottom: "8px solid transparent",
                filter: "drop-shadow(0 0 4px rgba(34,197,94,0.6))",
              }}
            />
          </div>
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded whitespace-nowrap backdrop-blur-sm">
            {Math.round(Math.min(dragIndicator.length / 3, 50))}% Power
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full h-full bg-linear-to-br from-slate-900 via-slate-800 to-black overflow-hidden"
        style={{
          pointerEvents: "auto",
          touchAction: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
          minHeight: "100vh",
          height: "100%",
          maxHeight: "100vh",
          position: "relative",
        }}
      />
    </div>
  );
}
