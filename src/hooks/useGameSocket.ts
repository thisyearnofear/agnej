import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAccount, useSignMessage } from "wagmi";

const SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";

export interface GameState {
  id: number;
  players: string[];
  activePlayers: string[];
  currentPlayer: string | null;
  status: "WAITING" | "ACTIVE" | "ENDED" | "COLLAPSED";
  maxPlayers: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  stake: number;
  isPractice: boolean;
  turnDeadline: number;
}

export interface PhysicsBlockState {
  position: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
  velocity: { x: number; y: number; z: number };
}

export interface GameSettingsConfig {
  gameMode:
    | "SOLO_PRACTICE"
    | "SOLO_COMPETITOR"
    | "SINGLE_VS_AI"
    | "MULTIPLAYER";
  playerCount: number;
  aiOpponentCount?: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  stake: number;
  isHost?: boolean;
}

export function useGameSocket(settings?: GameSettingsConfig) {
  const { address } = useAccount();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [physicsState, setPhysicsState] = useState<PhysicsBlockState[] | null>(
    null,
  );
  const [timeLeft, setTimeLeft] = useState(30);
  const [lobbies, setLobbies] = useState<GameState[]>([]);
  const { signMessageAsync } = useSignMessage();
  const [authSignature, setAuthSignature] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  // Persistence: Load Auth from LocalStorage
  useEffect(() => {
    if (typeof window === "undefined" || !address) return;
    const storedSig = localStorage.getItem("agnej_auth_sig");
    const storedMsg = localStorage.getItem("agnej_auth_msg");
    if (storedSig && storedMsg) {
      // Defer state update to next tick to avoid cascading render warning
      void Promise.resolve().then(() => {
        setAuthSignature(storedSig);
        setAuthMessage(storedMsg);
      });
    }
  }, [address]);

  // Ref to prevent multiple connections in React Strict Mode
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Don't connect to server for solo practice & competitor modes
    if (
      settings?.gameMode === "SOLO_PRACTICE" ||
      settings?.gameMode === "SOLO_COMPETITOR"
    ) {
      console.log(`${settings.gameMode}: Skipping server connection`);
      // Defer state reset to next tick to avoid cascading render warning
      void Promise.resolve().then(() => {
        setSocket(null);
        setIsConnected(false);
        setGameState(null);
      });
      return;
    }

    // Required: Must have auth to connect
    if (!authSignature || !authMessage || !address) {
      console.log("Waiting for authentication...");
      return;
    }

    if (socketRef.current) return;

    console.log("Connecting to Game Server:", SERVER_URL);

    const newSocket = io(SERVER_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
      auth: {
        address,
        signature: authSignature,
        message: authMessage,
      },
    });

    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      console.log("Socket Connected:", newSocket.id);
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket Disconnected");
      setIsConnected(false);
    });

    newSocket.on("gameState", (state: GameState) => {
      console.log("Game State Update:", state);
      setGameState(state);
    });

    newSocket.on(
      "turnChanged",
      (data: { player: string; deadline: number }) => {
        console.log("Turn changed:", data.player);
        setTimeLeft(30); // Reset timer for new turn
      },
    );

    newSocket.on("gameCollapsed", (data: { survivors: string[] }) => {
      console.log("Tower collapsed! Survivors:", data.survivors);
    });

    newSocket.on("physicsUpdate", (state: PhysicsBlockState[]) => {
      setPhysicsState(state);
    });

    newSocket.on("gameCreated", (data: { gameId: number }) => {
      console.log("Game Created:", data.gameId);
      if (settings?.isHost && address) {
        console.log("Host joining specific game:", data.gameId);
        newSocket.emit("joinGame", {
          address: address,
          gameId: data.gameId,
        });
      }
    });

    newSocket.on("lobbyList", (data: GameState[]) => {
      setLobbies(data);
    });

    newSocket.on("error", (err: unknown) => {
      const message =
        typeof err === "string"
          ? err
          : (err as Error).message || "Unknown error";
      console.error("[Socket] Error:", message);
      // Auth errors require re-authentication
      if (message.includes("Authentication")) {
        localStorage.removeItem("agnej_auth_sig");
        localStorage.removeItem("agnej_auth_msg");
        setAuthSignature(null);
        setAuthMessage(null);
      }
    });

    // Initialize connection - defer to avoid cascading render warning
    void Promise.resolve().then(() => {
      setSocket(newSocket);
    });

    // Connection logic moved inside 'connect' listener or here if we want to be optimistic
    // But 'connect' listener is safer for emits

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [settings, address, authSignature, authMessage]); // Re-run if settings/address/auth changes

  // Handle initial setup when socket connects
  useEffect(() => {
    if (!socket || !isConnected || !settings) return;

    if (settings.isHost) {
      // Host creates game, then waits for 'gameCreated' to join (handled in listener above)
      socket.emit("createGame", {
        maxPlayers:
          settings.gameMode === "MULTIPLAYER"
            ? settings.playerCount
            : (settings.aiOpponentCount || 1) + 1,
        difficulty: settings.difficulty,
        stake: settings.stake,
        isPractice: false,
      });
    } else {
      // Join existing game (Auto-match for now)
      if (address) {
        socket.emit("joinGame", address);
      }
    }
  }, [socket, isConnected, settings, address]);

  // Timer for turn countdown
  useEffect(() => {
    if (gameState?.status === "ACTIVE" && gameState?.turnDeadline > 0) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(
          0,
          Math.ceil((gameState.turnDeadline - now) / 1000),
        );
        setTimeLeft(remaining);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState?.turnDeadline, gameState?.status]);

  const submitMove = (moveData: unknown) => {
    if (socket) {
      socket.emit("submitMove", moveData);
    }
  };

  // ENHANCEMENT: Add spectator parameter to existing joinGame function
  const joinGame = (asSpectator: boolean = false) => {
    if (socket && address) {
      socket.emit("joinGame", {
        address,
        asSpectator,
      });
    }
  };

  const surrender = () => {
    if (socket && address) {
      socket.emit("surrender", address);
    }
  };

  return {
    socket,
    isConnected,
    gameState,
    physicsState,
    timeLeft,
    submitMove,
    joinGame,
    surrender,
    authSignature,
    lobbies,
    fetchLobbies: () => {
      if (socket) socket.emit("getLobbies");
    },
    signAndConnect: async () => {
      if (!address) return;
      try {
        const message = `Login to Agnej: ${Date.now()}`;
        const signature = await signMessageAsync({ message });

        // Persistence: Save to LocalStorage
        localStorage.setItem("agnej_auth_sig", signature);
        localStorage.setItem("agnej_auth_msg", message);

        setAuthMessage(message);
        setAuthSignature(signature);
        // The useEffect will catch these state changes and reconnect socket
        // Or we can manually force reconnect if needed, but react state should handle
        // Actually, useEffect for socket depends on [settings, address], NOT authSignature currently.
        // We should add authSignature to dependancy or handle reconnect.
        // Reconnecting socket interrupts gameplay, so only do this initially?
        // Ideally, we sign BEFORE game starts (in Menu).
      } catch (err: unknown) {
        console.error("Signing failed", err);
      }
    },
  };
}
