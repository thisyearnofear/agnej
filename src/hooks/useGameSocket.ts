import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAccount } from 'wagmi';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

export interface GameState {
    id: number;
    players: string[];
    activePlayers: string[];
    currentPlayer: string | null;
    status: 'WAITING' | 'ACTIVE' | 'ENDED' | 'COLLAPSED';
    maxPlayers: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
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
    gameMode: 'SOLO_PRACTICE' | 'SOLO_COMPETITOR' | 'SINGLE_VS_AI' | 'MULTIPLAYER'
    playerCount: number
    aiOpponentCount?: number
    difficulty: 'EASY' | 'MEDIUM' | 'HARD'
    stake: number
}

export function useGameSocket(settings?: GameSettingsConfig) {
    const { address } = useAccount();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [physicsState, setPhysicsState] = useState<PhysicsBlockState[] | null>(null);
    const [timeLeft, setTimeLeft] = useState(30);

    // Ref to prevent multiple connections in React Strict Mode
    const socketRef = useRef<Socket | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Don't connect to server for solo practice & competitor modes
        if (settings?.gameMode === 'SOLO_PRACTICE' || settings?.gameMode === 'SOLO_COMPETITOR') {
            console.log(`${settings.gameMode}: Skipping server connection`);
            setSocket(null);
            setIsConnected(false);
            setGameState(null);
            return;
        }

        if (socketRef.current) return;

        console.log('Connecting to Game Server:', SERVER_URL);

        const newSocket = io(SERVER_URL, {
            transports: ['websocket'],
            reconnectionAttempts: 5,
        });

        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            console.log('Socket Connected:', newSocket.id);
            setIsConnected(true);

            if (settings) {
                newSocket.emit('createGame', {
                    maxPlayers: settings.gameMode === 'MULTIPLAYER' ? settings.playerCount : (settings.aiOpponentCount || 1) + 1,
                    difficulty: settings.difficulty,
                    stake: settings.stake,
                    isPractice: false
                });
            }
        });

        newSocket.on('disconnect', () => {
            console.log('Socket Disconnected');
            setIsConnected(false);
        });

        newSocket.on('gameState', (state: GameState) => {
            console.log('Game State Update:', state);
            setGameState(state);
        });

        newSocket.on('turnChanged', (data: { player: string, deadline: number }) => {
            console.log('Turn changed:', data.player);
            setTimeLeft(30); // Reset timer for new turn
        });

        newSocket.on('gameCollapsed', (data: { survivors: string[] }) => {
            console.log('Tower collapsed! Survivors:', data.survivors);
        });

        newSocket.on('physicsUpdate', (state: PhysicsBlockState[]) => {
            setPhysicsState(state);
        });

        setSocket(newSocket);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [settings]);

    // Timer for turn countdown
    useEffect(() => {
        if (gameState?.status === 'ACTIVE' && gameState?.turnDeadline > 0) {
            timerRef.current = setInterval(() => {
                const now = Date.now();
                const remaining = Math.max(0, Math.ceil((gameState.turnDeadline - now) / 1000));
                setTimeLeft(remaining);
            }, 100);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameState?.turnDeadline, gameState?.status]);

    const submitMove = (moveData: any) => {
        if (socket) {
            socket.emit('submitMove', moveData);
        }
    };

    const joinGame = () => {
        if (socket && address) {
            socket.emit('joinGame', address);
        }
    };

    const surrender = () => {
        if (socket && address) {
            socket.emit('surrender', address);
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
        surrender
    };
}
