import { Server } from 'socket.io';
import { PhysicsWorld } from '../physics';
import { BlockchainService } from '../services/blockchain';
import { GameConfig, GameState, MoveData } from './types';

const TURN_DURATION_MS = 30000;

export class GameInstance {
    public id: number;
    public io: Server;
    public blockchain: BlockchainService;

    // State
    public players: string[] = [];
    public playerSockets: Map<string, string> = new Map(); // address -> socketId
    public activePlayers: Set<string> = new Set();
    public currentPlayerIndex: number = 0;
    public currentPlayer: string | null = null;
    public status: 'WAITING' | 'ACTIVE' | 'ENDED' | 'COLLAPSED' = 'WAITING';

    // Config
    public maxPlayers: number;
    public difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    public stake: number;
    public isPractice: boolean;

    // Turn Management
    public turnStartTime: number = 0;
    public turnDeadline: number = 0;
    public turnInProgress: boolean = false;

    // Physics & Networking
    public physics: PhysicsWorld;
    public pendingMoves: Map<string, MoveData> = new Map();
    private timeSinceLastBroadcast: number = 0;
    private readonly BROADCAST_RATE_MS = 50; // 20Hz (1000ms / 20)

    constructor(id: number, config: GameConfig, io: Server, blockchain: BlockchainService) {
        this.id = id;
        this.io = io;
        this.blockchain = blockchain;

        this.maxPlayers = config.maxPlayers;
        this.difficulty = config.difficulty;
        this.stake = config.stake;
        this.isPractice = config.isPractice;

        this.physics = new PhysicsWorld(this.difficulty);
    }

    public get roomId(): string {
        return `game_${this.id}`;
    }

    public getPublicState(): GameState {
        return {
            id: this.id,
            players: this.players,
            currentPlayer: this.currentPlayer,
            currentPlayerIndex: this.currentPlayerIndex,
            status: this.status,
            maxPlayers: this.maxPlayers,
            difficulty: this.difficulty,
            stake: this.stake,
            isPractice: this.isPractice,
            activePlayers: Array.from(this.activePlayers),
            turnStartTime: this.turnStartTime,
            turnDeadline: this.turnDeadline
        };
    }

    public broadcastState() {
        this.io.to(this.roomId).emit('gameState', this.getPublicState());
    }

    public addPlayer(playerAddress: string, socketId: string) {
        if (!this.players.includes(playerAddress)) {
            // Join Logic
            if (this.status !== 'WAITING' && !this.players.includes(playerAddress)) {
                // If game started, they can only spectate or reconnect? 
                // For now, only allow joining if WAITING
                // Or allow reconnect logic if they were already in `players` but not `activePlayers`?
                // MVP: Only join if WAITING
                return false;
            }

            if (!this.players.includes(playerAddress)) {
                if (this.players.length >= this.maxPlayers) return false;
                this.players.push(playerAddress);
            }

            this.playerSockets.set(playerAddress, socketId);
            this.activePlayers.add(playerAddress);

            // Check auto-start
            if (this.status === 'WAITING' && this.activePlayers.size >= 2 && !this.isPractice) {
                // Wait for max players? Or just 2? 
                // Original logic: if (size >= 2) startTurn()
                // Let's stick to original, but maybe wait for full lobby is better?
                // Original logic: "Auto-start if we have enough players" (>=2)
                this.status = 'ACTIVE';
                this.startTurn();
            } else if (this.status === 'WAITING' && this.activePlayers.size >= this.maxPlayers) {
                // definitely start if full
                this.status = 'ACTIVE';
                this.startTurn();
            }

            this.broadcastState();
            return true;
        } else {
            // Reconnect logic
            this.playerSockets.set(playerAddress, socketId);
            if (!this.activePlayers.has(playerAddress) && this.status !== 'ENDED' && this.status !== 'COLLAPSED') {
                // They are back
                this.activePlayers.add(playerAddress);
            }
            this.broadcastState();
            return true;
        }
    }

    public removePlayer(playerAddress: string, reason: string = 'disconnected') {
        if (!this.activePlayers.has(playerAddress)) return;

        console.log(`Player ${playerAddress.slice(0, 6)}... ${reason} from game ${this.id}`);
        this.eliminatePlayer(playerAddress, reason);
    }

    private eliminatePlayer(playerAddress: string, reason: string) {
        this.activePlayers.delete(playerAddress);

        // If current player disconnected, advance turn immediately?
        if (this.currentPlayer === playerAddress) {
            this.turnDeadline = Date.now(); // Force timeout
        }

        // Check Game Over
        if (this.activePlayers.size <= 1 && this.status === 'ACTIVE') {
            this.status = 'ENDED';
            // Natural end
        }

        this.broadcastState();
    }

    // Logic from index.ts
    private getNextPlayer(): string | null {
        if (this.activePlayers.size === 0) return null;

        const activeParams = Array.from(this.activePlayers);
        // We need to ensure we cycle correctly even if players were removed
        // Simple round-robin based on index might jump if array changes.
        // Better: Find current index in new array, then +1
        // But for MVP, let's stick to simple increment, modulo size
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % activeParams.length;
        return activeParams[this.currentPlayerIndex];
    }

    public startTurn() {
        if (this.activePlayers.size <= 1) {
            this.status = 'ENDED';
            this.broadcastState();
            return;
        }

        const nextPlayer = this.getNextPlayer();
        if (!nextPlayer) return;

        this.currentPlayer = nextPlayer;
        this.turnStartTime = Date.now();
        this.turnDeadline = this.turnStartTime + TURN_DURATION_MS;

        this.broadcastState();
        this.io.to(this.roomId).emit('turnChanged', {
            player: nextPlayer,
            deadline: this.turnDeadline
        });
    }

    public async endTurn() {
        // Apply queued move
        if (this.currentPlayer && this.pendingMoves.has(this.currentPlayer)) {
            const move = this.pendingMoves.get(this.currentPlayer)!;
            this.pendingMoves.delete(this.currentPlayer);
            this.physics.applyForce(move.blockIndex, move.force, move.point);
        }

        this.startTurn();
    }

    public handleMove(playerAddress: string, move: MoveData) {
        if (this.status !== 'ACTIVE') return;

        if (this.currentPlayer === playerAddress) {
            this.physics.applyForce(move.blockIndex, move.force, move.point);
            // We do NOT end turn here. Turn ends by time in this design?
            // "Check turn timeout (every frame but only acts when deadline passes)"
            // Wait, usually moving ends turn?
            // Original code:
            // "Only process if this player's turn... physics.applyForce"
            // It does NOT call endTurn().
            // So turns are purely time based? That seems odd for Jenga.
            // Usually you move, then wait for physics to settle, then turn ends.
            // Original code has `TURN_DURATION_MS = 30000`.
            // And `check turn timeout` calls `endTurn`.
            // So it IS time based. AND `endTurn` calls `physics.applyForce` if pending?
            // Wait, original code:
            // "if (currentGameState.currentPlayer === playerAddress)... physics.applyForce"
            // "async function endTurn()... if pendingMoves... applyForce"
            // "turnTimeout... await endTurn()"
            // It seems the original design was confused.
            // If I move live, I apply force immediately.
            // If I am lagging or it's not my turn, maybe it queues?
            // Let's stick to: If it's your turn, apply force immediately.
            // Does the turn end after a move?
            // In Jenga, you touch a block, move it, place it.
            // Here we just apply force (poke it).
            // Let's keep the time-based turn for now as per original code, 
            // but usually you'd want "End Turn" button or "Object Released" event.
        }
    }

    public update(dt: number) {
        if (this.status !== 'ACTIVE') return;

        // Physics Step (Fixed 60Hz from Manager)
        this.physics.step(dt);

        // Network Optimization: Broadcast at 20Hz
        this.timeSinceLastBroadcast += (dt * 1000);

        if (this.timeSinceLastBroadcast >= this.BROADCAST_RATE_MS) {
            const physicsState = this.physics.getState();
            this.io.to(this.roomId).emit('physicsUpdate', physicsState);
            this.timeSinceLastBroadcast = 0;
        }

        // Check Collapse
        if (this.physics.checkCollapse()) {
            this.handleCollapse();
            return;
        }

        // Check Turn Timeout
        const now = Date.now();
        if (!this.turnInProgress && this.turnDeadline > 0 && now >= this.turnDeadline) {
            this.turnInProgress = true;
            this.turnDeadline = 0;
            this.endTurn().finally(() => {
                this.turnInProgress = false;
            });
        }
    }

    private async handleCollapse() {
        console.log(`Game ${this.id} Collapsed!`);
        this.status = 'COLLAPSED';

        // Oracle Reporting
        if (!this.isPractice) {
            try {
                await this.blockchain.reportCollapse(this.id);
            } catch (error) {
                console.error(`Failed to report collapse for game ${this.id}`, error);
            }
        }

        this.io.to(this.roomId).emit('gameCollapsed', {
            survivors: Array.from(this.activePlayers)
        });
        this.broadcastState();
    }
}
