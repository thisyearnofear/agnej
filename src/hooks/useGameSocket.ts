import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

export interface GameState {
    id: number;
    players: string[];
    currentPlayer: string | null;
    status: 'WAITING' | 'ACTIVE' | 'ENDED';
}

export function useGameSocket() {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [gameState, setGameState] = useState<GameState | null>(null);

    // Ref to prevent multiple connections in React Strict Mode
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
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
        });

        newSocket.on('disconnect', () => {
            console.log('Socket Disconnected');
            setIsConnected(false);
        });

        newSocket.on('gameState', (state: GameState) => {
            console.log('Game State Update:', state);
            setGameState(state);
        });

        setSocket(newSocket);

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, []);

    const submitMove = (moveData: any) => {
        if (socket) {
            socket.emit('submitMove', moveData);
        }
    };

    return {
        socket,
        isConnected,
        gameState,
        submitMove
    };
}
