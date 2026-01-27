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
import { loadScript, getPhysicsConfig } from "./Game/physicsHelpers";

// External lib declarations
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var Physijs: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var THREE: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var Stats: any;
}

import GameUI, { type GameState } from "./GameUI";
import GameOver from "./MultiplayerGameOver";
import SpectatorOverlay from "./SpectatorOverlay";

import { useGameContract } from "../hooks/useGameContract";
import { useGameSocket } from "../hooks/useGameSocket";
import { useLeaderboard } from "../hooks/useLeaderboard";

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

  // Local Visual State
  const [potSize, setPotSize] = useState(0);
  const [fallenCount, setFallenCount] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [survivors, setSurvivors] = useState<
    Array<{ address: string; isWinner: boolean }>
  >([]);
  const [towerCollapsed, setTowerCollapsed] = useState(false);
  const [showRules, setShowRules] = useState(
    settings.gameMode.startsWith("SOLO"),
  );
  const [dragIndicator, setDragIndicator] = useState<{
    x: number;
    y: number;
    length: number;
    angle: number;
  } | null>(null);
  const [showHelpers, setShowHelpers] = useState(settings.showHelpers);
  const [now, setNow] = useState(0);
  // Local timer for SOLO_COMPETITOR mode (30 second time-attack)
  const [soloCompetitorTimeLeft, setSoloCompetitorTimeLeft] = useState(30);

  // Derived State
  const gameState: GameState = useMemo(() => {
    if (settings.gameMode.startsWith("SOLO")) return "ACTIVE";
    return (serverState?.status as GameState) || "WAITING";
  }, [settings.gameMode, serverState?.status]);

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

  const timeLeft = useMemo(
    () =>
      settings.gameMode === "MULTIPLAYER"
        ? serverTimeLeft
        : settings.gameMode === "SOLO_COMPETITOR"
          ? soloCompetitorTimeLeft
          : 30,
    [settings.gameMode, serverTimeLeft, soloCompetitorTimeLeft],
  );
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
    const sc = sceneRef.current;
    const e = engineRef.current;
    if (!sc || !e.materials.block) return;
    const pc = getPhysicsConfig(settings.difficulty);
    const geom = new THREE.BoxGeometry(6, 1, 1.5);
    for (let i = 0; i < 16; i++) {
      const isLocked = settings.gameMode === "SOLO_COMPETITOR" && i >= 14;
      const mat = isLocked ? e.materials.lockedBlock : e.materials.block;
      for (let j = 0; j < 3; j++) {
        const b = new Physijs.BoxMesh(geom, mat, pc.mass);
        b.position.y = 0.5 + i;
        if (i % 2 === 0) {
          b.rotation.y = Math.PI / 2.01;
          b.position.x = 2 * j - 2;
        } else {
          b.position.z = 2 * j - 2;
        }
        b.receiveShadow = b.castShadow = true;
        b.setDamping(pc.damping, pc.damping);
        b.userData = { layer: i, isLocked };
        sc.add(b);
        blocksRef.current.push(b);
      }
    }
  }, [settings.gameMode, settings.difficulty]);

  const renderFrame = useCallback(
    function animate() {
      requestRef.current = requestAnimationFrame(animate);
      const e = engineRef.current;
      const s = sceneRef.current;
      if (e.renderer && s && e.camera) {
        e.renderer.render(s, e.camera);
        if (settings.gameMode.startsWith("SOLO") && !gameOverRef.current) {
          const t = Date.now();
          if (t - e.lastPhysicsUpdate > 4000) {
            e.lastPhysicsUpdate = t;
            s.simulate();
          }
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
      if (isSpectator || gameState !== "ACTIVE" || gameOverRef.current) return;
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
        if (settings.gameMode === "SOLO_COMPETITOR" && b.userData.layer >= 14)
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
    const e = engineRef.current;
    e.interaction.mousePos = new THREE.Vector3();
    e.interaction.offset = new THREE.Vector3();
    e.lastPhysicsUpdate = Date.now();
    blocksRef.current = [];
    const container = containerRef.current;
    if (!container) return () => {};
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

    const s = new Physijs.Scene({ fixedTimeStep: 1 / 120 });
    sceneRef.current = s;
    s.setGravity(new THREE.Vector3(0, -30, 0));
    const onUpdate = () => {
      e.lastPhysicsUpdate = Date.now();
      if (settings.gameMode.startsWith("SOLO") && !gameOverRef.current) {
        s.simulate();
        if (settings.gameMode === "SOLO_COMPETITOR") {
          blocksRef.current.forEach((b) => {
            if (
              b.position.x ** 2 + b.position.z ** 2 > 100 &&
              !scoredBlocksRef.current.has(b.id)
            ) {
              scoredBlocksRef.current.add(b.id);
              setScore((v) => v + 1);
            }
            if (b.userData.isLocked && b.position.y < 2) {
              setGameOver(true);
            }
          });
        }
      }
    };
    sceneUpdateListenerRef.current = onUpdate;
    s.addEventListener("update", onUpdate);
    requestRef.current = requestAnimationFrame(renderFrame);

    if (settings.gameMode.startsWith("SOLO")) {
      const check = () => {
        if (s._worker) s.simulate();
        else workerCheckTimeouts.current.add(setTimeout(check, 50));
      };
      workerCheckTimeouts.current.add(setTimeout(check, 100));
    }
    e.camera = new THREE.PerspectiveCamera(
      35,
      (r.width || window.innerWidth) / (r.height || window.innerHeight),
      1,
      1000,
    );
    e.camera.position.set(25, 20, 25);
    e.camera.lookAt(0, 7, 0);
    s.add(new THREE.AmbientLight(0x444444));
    const dl = new THREE.DirectionalLight(0xffffff);
    dl.position.set(20, 30, -5);
    dl.castShadow = true;
    s.add(dl);
    const loader = new THREE.TextureLoader();
    const pc = getPhysicsConfig(settings.difficulty);
    const wt = loader.load("/images/wood.jpg");
    const pt = loader.load("/images/plywood.jpg");
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
    const table = new Physijs.BoxMesh(
      new THREE.BoxGeometry(50, 1, 50),
      e.materials.table,
      0,
    );
    table.position.y = -0.5;
    table.receiveShadow = true;
    s.add(table);
    createTower();
    e.interaction.plane = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 150),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    e.interaction.plane.rotation.x = Math.PI / -2;
    s.add(e.interaction.plane);

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
    setFallenCount(0);
    setScore(0);
    setGameOver(false);
    setSoloCompetitorTimeLeft(30); // Reset timer for SOLO_COMPETITOR
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
    setNow(Date.now());
    const itv = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(itv);
  }, []);

  // SOLO_COMPETITOR: 30 second countdown timer
  useEffect(() => {
    if (settings.gameMode !== "SOLO_COMPETITOR" || gameOver) return;
    
    const timer = setInterval(() => {
      setSoloCompetitorTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - trigger game over
          setGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [settings.gameMode, gameOver]);

  // Main Init Effect
  useEffect(() => {
    if (typeof window === "undefined" || initializedRef.current) return;
    initializedRef.current = true;
    let eventCleanup: (() => void) | undefined;
    const initAll = async () => {
      try {
        if (!window.THREE) await loadScript("/js/three.min.js");
        if (!window.Stats) await loadScript("/js/stats.js");
        if (!window.Physijs) await loadScript("/js/physi.js");
        if (window.Physijs) {
          window.Physijs.scripts.worker = "/js/physijs_worker.js";
          window.Physijs.scripts.ammo = "/js/ammo.js";
        }
        eventCleanup = initScene();
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
        console.error("Init error:", err);
      }
    };
    void initAll();
    const timeouts = workerCheckTimeouts.current;
    const engine = engineRef.current;
    return () => {
      timeouts.forEach(clearTimeout);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
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
      setTowerCollapsed(true);
      const sl =
        serverState.activePlayers?.map((addr: string) => ({
          address: addr,
          isWinner: false,
        })) || [];
      if (sl.length > 0) sl[0].isWinner = true;
      setSurvivors(sl);
      setGameOver(true);
    } else if (serverState.status === "ENDED") {
      setGameOver(true);
      const sl =
        serverState.activePlayers?.map((addr: string) => ({
          address: addr,
          isWinner: true,
        })) || [];
      setSurvivors(sl);
    }
  }, [serverState, settings.gameMode]);

  return (
    <div className="relative w-full h-full game-container">
      <GameUI
        gameState={gameOver ? "ENDED" : gameState}
        potSize={potSize}
        timeLeft={timeLeft ?? 30}
        players={players}
        currentPlayerId={currentPlayerId}
        fallenCount={fallenCount}
        totalBlocks={16 * 3}
        maxPlayers={
          settings.gameMode === "MULTIPLAYER"
            ? settings.playerCount
            : (settings.aiOpponentCount || 1) + 1
        }
        difficulty={settings.difficulty}
        stake={settings.stake}
        isPractice={settings.gameMode.startsWith("SOLO")}
        score={score}
        highScore={highScore}
        gameMode={settings.gameMode}
        onJoin={() => {
          if (settings.gameMode === "MULTIPLAYER") joinGame(isSpectatorMode);
          else contractJoin(referrer || undefined);
        }}
        onReload={() => {
          if (settings.gameMode.startsWith("SOLO")) resetTower();
          else {
            void contractReload();
            setPotSize((p) => p + 1);
          }
        }}
        onVote={(split) => alert(`Voted to ${split ? "Split" : "Continue"}`)}
        onExit={onExit}
        showRules={showRules}
        setShowRules={setShowRules}
        showHelpers={showHelpers}
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
