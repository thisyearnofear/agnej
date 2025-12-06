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
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for dev
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

// Auth Middleware
io.use((socket, next) => {
    const { address, signature, message } = socket.handshake.auth;

    // Optional: Allow unauthenticated for dev/practice? 
    // For now, we want to enforce it if provided, or reject if game mode requires it.
    // Simplifying: If credentials provided, verify them.
    if (address && signature && message) {
        if (AuthService.verifySignature(address, message, signature)) {
            socket.data.authenticatedAddress = address;
            console.log(`[Auth] Verified ${address}`);
            next();
        } else {
            console.log(`[Auth] Failed verification for ${address}`);
            next(new Error("Authentication failed"));
        }
    } else {
        // Allow anonymous connection (for practice?), but joinGame will check.
        // Or stricter: reject all unauthenticated connections?
        // Let's allow connection but mark as unauthenticated.
        console.log('[Auth] Unauthenticated connection');
        next();
    }
});

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle Game Creation
    socket.on('createGame', (config: { maxPlayers: number; difficulty: string; stake: number; isPractice: boolean }) => {
        // Only authenticated users can create ranked games
        if (!config.isPractice && !socket.data.authenticatedAddress) {
            socket.emit('error', 'Authentication required for ranked games.');
            return;
        }

        const game = gameManager.createGame({
            maxPlayers: config.maxPlayers,
            difficulty: config.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
            stake: config.stake,
            isPractice: config.isPractice
        });

        // Return gameId so client knows which room to join if needed, 
        // though currently we auto-match on null gameId in joinGame.
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

        // SECURITY: Enforce that the joining address matches the authenticated socket address
        if (socket.data.authenticatedAddress &&
            socket.data.authenticatedAddress.toLowerCase() !== playerAddress.toLowerCase()) {
            console.warn(`[Security] Spoof attempt? Socket auth: ${socket.data.authenticatedAddress}, claimed: ${playerAddress}`);
            socket.emit('error', 'Authentication mismatch.');
            return;
        }

        // If not authenticated at all, can they join? 
        // Practice yes, Ranked no.
        // GameManager checks payment, but we also want to stop general spoofing.
        if (!socket.data.authenticatedAddress) {
            // For now, allow practice joins if we implement that check later.
            // But for safety, let's warn.
        }

        const game = gameManager.joinGame(socket, playerAddress, gameId);

        if (!game) {
            socket.emit('error', 'Could not find a game to join or create.');
        }
    });

    // Handle Physics Moves
    socket.on('submitMove', (data: { blockIndex: number, force: any, point: any }) => {
        gameManager.handleMove(socket.id, data);
    });

    // Handle Surrender
    socket.on('surrender', () => {
        gameManager.handleSurrender(socket.id);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        gameManager.handleDisconnect(socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Game Server running on port ${PORT}`);
});
