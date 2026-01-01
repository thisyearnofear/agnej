import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { BlockchainService } from './services/blockchain';
import { GameManager } from './game/GameManager';
import { AuthService } from './services/auth';

dotenv.config();

const app = express();

// CORS configuration: Use environment variable for production, default to localhost for dev
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({ origin: corsOrigin }));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: corsOrigin,
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3001;

// Initialize Services
const blockchain = new BlockchainService();
const gameManager = new GameManager(io, blockchain);

// Setup Blockchain Event Listeners
// TODO: Refactor BlockchainService to be more robust, for now we map events to game state
blockchain.listenToEvents({
    onPlayerJoined: (gameId, player) => {
        // If we want to support blockchain-driven game creation/state sync:
        // const game = gameManager.getGame(gameId) || gameManager.createGame({ ...defaults });
        // game.addPlayerFromChain(player);
        console.log(`[Blockchain] Player ${player} joined game ${gameId}`);
    },
    onGameStarted: (gameId) => {
        console.log(`[Blockchain] Game ${gameId} started`);
    },
    onTurnChanged: (gameId, player, deadline) => {
        console.log(`[Blockchain] Turn changed in ${gameId} to ${player}`);
    }
});

// Auth Middleware - REQUIRED for all connections
io.use((socket, next) => {
    const { address, signature, message } = socket.handshake.auth;

    // All connections must be authenticated
    if (!address || !signature || !message) {
        console.log('[Auth] Connection rejected: Missing credentials');
        next(new Error("Authentication required: Missing address, signature, or message"));
        return;
    }

    if (AuthService.verifySignature(address, message, signature)) {
        socket.data.authenticatedAddress = address;
        console.log(`[Auth] Verified ${address}`);
        next();
    } else {
        console.log(`[Auth] Failed verification for ${address}`);
        next(new Error("Authentication failed: Invalid signature"));
    }
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle Game Creation
    socket.on('createGame', (config: { maxPlayers: number; difficulty: string; stake: number; isPractice: boolean }) => {
        const game = gameManager.createGame({
            maxPlayers: config.maxPlayers,
            difficulty: config.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
            stake: config.stake,
            isPractice: config.isPractice
        });

        socket.emit('gameCreated', { gameId: game.id });
    });

    socket.on('getLobbies', () => {
        const lobbies = gameManager.getPublicLobbies();
        socket.emit('lobbyList', lobbies);
    });

    // Handle Player Join
    socket.on('joinGame', (data: any) => {
        // Support both old format (string) and new format (object)
        let playerAddress: string;
        let gameId: number | undefined;

        if (typeof data === 'string') {
            playerAddress = data;
        } else {
            playerAddress = data.address;
            gameId = data.gameId;
        }

        // SECURITY: Enforce that joining address matches authenticated socket address
        if (socket.data.authenticatedAddress.toLowerCase() !== playerAddress.toLowerCase()) {
            console.warn(`[Security] Spoof attempt? Socket auth: ${socket.data.authenticatedAddress}, claimed: ${playerAddress}`);
            socket.emit('error', 'Authentication mismatch.');
            return;
        }

        const game = gameManager.joinGame(socket, playerAddress, gameId);

        if (!game) {
            socket.emit('error', 'Could not find a game to join or create.');
        }
    });

    // Handle Physics Moves (with validation)
    socket.on('submitMove', (data: { blockIndex: number, force: any, point: any }) => {
        try {
            gameManager.handleMove(socket.id, data);
        } catch (error: any) {
            console.error('[Move Handler] Error:', error.message);
            socket.emit('error', 'Failed to process move.');
        }
    });

    // Handle Surrender
    socket.on('surrender', () => {
        try {
            gameManager.handleSurrender(socket.id);
        } catch (error: any) {
            console.error('[Surrender Handler] Error:', error.message);
            socket.emit('error', 'Failed to process surrender.');
        }
    });

    socket.on('disconnect', () => {
        console.log('[Socket] Client disconnected:', socket.id);
        gameManager.handleDisconnect(socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT}`);
    console.log(`[CORS] Origin: ${corsOrigin}`);
    console.log(`[Blockchain] Listening to contract events...`);
});
