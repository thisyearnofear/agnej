import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { BlockchainService } from './services/blockchain';
import { PhysicsWorld } from './physics';

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
const TURN_DURATION_MS = 30000; // 30 seconds per turn

// Game State (In-Memory for MVP)
interface GameState {
    id: number;
    players: string[]; // Wallet addresses
    playerSockets: Map<string, string>; // Address -> Socket.io ID mapping
    currentPlayerIndex: number; // Track index for round-robin turns
    currentPlayer: string | null; // Wallet address of current player
    status: 'WAITING' | 'ACTIVE' | 'ENDED' | 'COLLAPSED';
    maxPlayers: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    stake: number;
    isPractice: boolean;
    turnStartTime: number;
    turnDeadline: number;
    activePlayers: Set<string>; // Wallet addresses of players still in game
    pendingMoves: Map<string, any>; // Queue moves during wrong player's turn
}

let currentGameState: GameState = {
    id: 0,
    players: [],
    playerSockets: new Map(),
    currentPlayerIndex: 0,
    currentPlayer: null,
    status: 'WAITING',
    maxPlayers: 7,
    difficulty: 'MEDIUM',
    stake: 1,
    isPractice: false,
    turnStartTime: 0,
    turnDeadline: 0,
    activePlayers: new Set(),
    pendingMoves: new Map()
};

// Initialize Blockchain Service
const blockchain = new BlockchainService();

// Setup Event Listeners
blockchain.listenToEvents({
    onPlayerJoined: (gameId, player) => {
        if (currentGameState.id !== gameId) {
            // New game detected? Or just sync issue. 
            // For MVP assume single game instance
            currentGameState.id = gameId;
        }
        if (!currentGameState.players.includes(player)) {
            currentGameState.players.push(player);
        }
        io.emit('gameState', currentGameState);
    },
    onGameStarted: (gameId) => {
        currentGameState.status = 'ACTIVE';
        io.emit('gameState', currentGameState);
    },
    onTurnChanged: (gameId, player, deadline) => {
        currentGameState.currentPlayer = player;
        io.emit('gameState', currentGameState);
        io.emit('turnChanged', { player, deadline });
    }
});

// Initialize Physics
let physics = new PhysicsWorld('MEDIUM');

// Turn Management Helper
function getNextPlayer(): string | null {
    if (currentGameState.activePlayers.size === 0) return null;
    
    const activePlayers = Array.from(currentGameState.activePlayers);
    currentGameState.currentPlayerIndex = (currentGameState.currentPlayerIndex + 1) % activePlayers.length;
    return activePlayers[currentGameState.currentPlayerIndex];
}

function startTurn(): void {
    if (currentGameState.activePlayers.size <= 1) {
        currentGameState.status = 'ENDED';
        io.emit('gameState', sanitizeGameState(currentGameState));
        console.log('Game ended - only 1 player left');
        return;
    }

    const nextPlayer = getNextPlayer();
    if (!nextPlayer) return;

    currentGameState.currentPlayer = nextPlayer;
    currentGameState.turnStartTime = Date.now();
    currentGameState.turnDeadline = currentGameState.turnStartTime + TURN_DURATION_MS;

    console.log(`Turn started for ${nextPlayer.slice(0, 6)}...`);
    io.emit('gameState', sanitizeGameState(currentGameState));
    io.emit('turnChanged', {
        player: nextPlayer,
        deadline: currentGameState.turnDeadline
    });
}

async function endTurn(): Promise<void> {
    // Process any pending moves queued for this player
    if (currentGameState.currentPlayer && currentGameState.pendingMoves.has(currentGameState.currentPlayer)) {
        const move = currentGameState.pendingMoves.get(currentGameState.currentPlayer);
        currentGameState.pendingMoves.delete(currentGameState.currentPlayer);
        physics.applyForce(move.blockIndex, move.force, move.point);
    }

    // ORACLE INTEGRATION: Call completeTurn on blockchain
    if (!currentGameState.isPractice) {
        try {
            await blockchain.completeTurn(currentGameState.id);
        } catch (error) {
            console.error('Failed to call completeTurn oracle:', error);
            // Continue anyway - turn advances locally even if oracle fails
        }
    }

    startTurn(); // Auto-advance to next player
}

function sanitizeGameState(state: GameState) {
    return {
        id: state.id,
        players: state.players,
        currentPlayer: state.currentPlayer,
        status: state.status,
        maxPlayers: state.maxPlayers,
        difficulty: state.difficulty,
        stake: state.stake,
        isPractice: state.isPractice,
        activePlayers: Array.from(state.activePlayers),
        turnDeadline: state.turnDeadline
    };
}

// DRY: Single source of truth for player elimination
function eliminatePlayer(playerAddress: string, reason: string = 'eliminated'): void {
    if (!currentGameState.activePlayers.has(playerAddress)) return;
    
    currentGameState.activePlayers.delete(playerAddress);
    console.log(`Player ${playerAddress.slice(0, 6)}... ${reason}. Remaining: ${currentGameState.activePlayers.size}`);
    
    // End game if only 1 or 0 players left
    if (currentGameState.activePlayers.size <= 1 && currentGameState.status === 'ACTIVE') {
        currentGameState.status = 'ENDED';
    }
    
    io.emit('gameState', sanitizeGameState(currentGameState));
}

// Physics & Game Loop (60 FPS)
let turnInProgress = false; // Prevent re-entrant turn handling
const gameLoopInterval = setInterval(async () => {
    try {
        if (currentGameState.status === 'ACTIVE') {
            physics.step(1 / 60);

            // Check Collapse
            if (physics.checkCollapse()) {
                console.log('Collapse Detected!');
                currentGameState.status = 'COLLAPSED';
                
                // ORACLE INTEGRATION: Report collapse on blockchain
                if (!currentGameState.isPractice) {
                    try {
                        await blockchain.reportCollapse(currentGameState.id);
                    } catch (error) {
                        console.error('Failed to report collapse oracle:', error);
                        // Continue anyway - survivors determined locally
                    }
                }
                
                io.emit('gameCollapsed', {
                    survivors: Array.from(currentGameState.activePlayers)
                });
                io.emit('gameState', sanitizeGameState(currentGameState));
                return;
            }

            // Broadcast physics state (60 FPS)
            const physicsState = physics.getState();
            io.emit('physicsUpdate', physicsState);

            // Check turn timeout (every frame but only acts when deadline passes)
            const now = Date.now();
            if (!turnInProgress && currentGameState.turnDeadline > 0 && now >= currentGameState.turnDeadline) {
                console.log('Turn timeout - advancing to next player');
                currentGameState.turnDeadline = 0; // Reset to prevent re-triggering
                turnInProgress = true;
                await endTurn();
                turnInProgress = false;
            }
        }
    } catch (error) {
        console.error('Game loop error:', error);
        // Game continues despite errors - don't crash the loop
    }
}, 1000 / 60);

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Send initial state
    socket.emit('gameState', sanitizeGameState(currentGameState));

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Find which player this socket belongs to
        let disconnectedAddress: string | null = null;
        for (const [address, sockId] of currentGameState.playerSockets.entries()) {
            if (sockId === socket.id) {
                disconnectedAddress = address;
                currentGameState.playerSockets.delete(address);
                break;
            }
        }

        // Remove player from active players using consolidated function
        if (disconnectedAddress) {
            eliminatePlayer(disconnectedAddress, 'disconnected');
        }
    });

    // Handle Game Creation with Settings
    socket.on('createGame', (config: { maxPlayers: number; difficulty: string; stake: number; isPractice: boolean }) => {
        console.log('Creating game with config:', config);

        currentGameState = {
            id: Date.now(),
            players: [],
            playerSockets: new Map(),
            currentPlayerIndex: 0,
            currentPlayer: null,
            status: 'WAITING',
            maxPlayers: config.maxPlayers,
            difficulty: config.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
            stake: config.stake,
            isPractice: config.isPractice,
            turnStartTime: 0,
            turnDeadline: 0,
            activePlayers: new Set(),
            pendingMoves: new Map()
        };

        // Re-initialize physics with new difficulty
        physics = new PhysicsWorld(currentGameState.difficulty);

        // Broadcast new game state
        io.emit('gameState', sanitizeGameState(currentGameState));
        console.log('Game created with ID:', currentGameState.id);
    });

    // Handle Player Join
    socket.on('joinGame', (playerAddress: string) => {
        console.log('Player joining:', playerAddress, 'with socket:', socket.id);

        if (!currentGameState.players.includes(playerAddress)) {
            currentGameState.players.push(playerAddress);
            currentGameState.playerSockets.set(playerAddress, socket.id);
            currentGameState.activePlayers.add(playerAddress);
        }

        // Auto-start if we have enough players
        if (currentGameState.status === 'WAITING' && currentGameState.activePlayers.size >= 2) {
            currentGameState.status = 'ACTIVE';
            startTurn(); // Begin first turn
        } else {
            io.emit('gameState', sanitizeGameState(currentGameState));
        }
    });

    // Handle Physics Moves
    socket.on('submitMove', (data: { blockIndex: number, force: any, point: any }) => {
        // Find which player this socket belongs to
        let playerAddress: string | null = null;
        for (const [address, sockId] of currentGameState.playerSockets.entries()) {
            if (sockId === socket.id) {
                playerAddress = address;
                break;
            }
        }

        if (!playerAddress) {
            console.warn('Move from unknown player socket:', socket.id);
            return;
        }

        // Only process if this player's turn
        if (currentGameState.currentPlayer === playerAddress) {
            if (currentGameState.status === 'ACTIVE') {
                physics.applyForce(data.blockIndex, data.force, data.point);
                console.log(`Move applied for ${playerAddress.slice(0, 6)}...`);
            }
        } else {
            // Queue move for later (optional - discard for now)
            console.log(`Move queued for ${playerAddress.slice(0, 6)}... (not their turn)`);
        }
    });

    // Handle Player Surrender/Elimination
    socket.on('surrender', (playerAddress: string) => {
        eliminatePlayer(playerAddress, 'surrendered');
    });
});

server.listen(PORT, () => {
    console.log(`Game Server running on port ${PORT}`);
});
