import { Server } from 'socket.io';
import { EventEmitter } from 'events';
import { PhysicsWorld } from '../physics';
import { BlockchainService } from '../services/blockchain';
import { GameConfig, GameState, MoveData } from './types';
import { TurnManager } from './TurnManager';
import { MoveValidator, ValidationResult } from './MoveValidator';
import { GameError, GameErrorCode, createGameError } from './errors';

const TURN_DURATION_MS = 30000;

export class GameInstance extends EventEmitter {
    public id: number;
    public io: Server;
    public blockchain: BlockchainService;

    // State
    public players: string[] = [];
    public playerSockets: Map<string, string> = new Map(); // address -> socketId
    public activePlayers: Set<string> = new Set();
    public status: 'WAITING' | 'ACTIVE' | 'ENDED' | 'COLLAPSED' = 'WAITING';

    // Config
    public maxPlayers: number;
    public difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    public stake: number;
    public isPractice: boolean;

    // Turn Management (delegated to TurnManager)
    private turnManager: TurnManager | null = null;

    // Physics & Networking
    public physics: PhysicsWorld;
    private moveValidator: MoveValidator = new MoveValidator();

    private timeSinceLastBroadcast: number = 0;
    private readonly BROADCAST_RATE_MS = 50; // 20Hz (1000ms / 20)

    // Lifecycle
    public lastActivityTime: number = Date.now();

    constructor(id: number, config: GameConfig, io: Server, blockchain: BlockchainService) {
        super();
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
        const turnState = this.turnManager?.getState();
        return {
            id: this.id,
            players: this.players,
            currentPlayer: turnState?.currentPlayer || null,
            currentPlayerIndex: this.players.findIndex(p => p === turnState?.currentPlayer) || 0,
            status: this.status,
            maxPlayers: this.maxPlayers,
            difficulty: this.difficulty,
            stake: this.stake,
            isPractice: this.isPractice,
            activePlayers: Array.from(this.activePlayers),
            turnStartTime: turnState?.startTime || 0,
            turnDeadline: turnState?.deadline || 0
        };
    }

    public broadcastState() {
        this.io.to(this.roomId).emit('gameState', this.getPublicState());
    }

    public addPlayer(playerAddress: string, socketId: string): boolean {
        if (!this.players.includes(playerAddress)) {
            // New player joining
            if (this.status !== 'WAITING') {
                // Game already started - can only spectate (not supported yet)
                console.warn(`[GameInstance] Cannot join mid-game. Status: ${this.status}`);
                this.emit('playerJoinFailed', {
                    reason: 'GAME_NOT_WAITING',
                    playerAddress
                });
                return false;
            }

            if (this.players.length >= this.maxPlayers) {
                this.emit('playerJoinFailed', {
                    reason: 'GAME_FULL',
                    playerAddress
                });
                return false;
            }

            this.players.push(playerAddress);
            this.playerSockets.set(playerAddress, socketId);
            this.activePlayers.add(playerAddress);
            this.lastActivityTime = Date.now();

            console.log(`[GameInstance] Player ${playerAddress} joined. Now ${this.players.length}/${this.maxPlayers}`);
            this.emit('playerJoined', { playerAddress });

            // Auto-start game when enough players present
            if (this.status === 'WAITING' && this.shouldAutoStart()) {
                this.startGame();
            }

            this.broadcastState();
            return true;
        } else {
            // Reconnection logic
            this.playerSockets.set(playerAddress, socketId);
            if (!this.activePlayers.has(playerAddress) && this.status !== 'ENDED' && this.status !== 'COLLAPSED') {
                this.activePlayers.add(playerAddress);
                this.lastActivityTime = Date.now();
                console.log(`[GameInstance] Player ${playerAddress} reconnected`);
                this.emit('playerReconnected', { playerAddress });
            }
            this.broadcastState();
            return true;
        }
    }

    /**
     * Determine if game should auto-start based on player count
     */
    private shouldAutoStart(): boolean {
        if (this.isPractice) return false;
        return this.activePlayers.size >= 2 || this.activePlayers.size >= this.maxPlayers;
    }

    /**
     * Start game and initialize turn manager
     */
    private startGame(): void {
        if (this.status !== 'WAITING') return;

        this.status = 'ACTIVE';
        const players = Array.from(this.activePlayers);
        this.turnManager = new TurnManager(players, TURN_DURATION_MS);

        // Wire up turn manager events
        this.turnManager.on('turnStarted', (turnState) => {
            this.lastActivityTime = Date.now();
            this.broadcastState();
            this.io.to(this.roomId).emit('turnChanged', {
                player: turnState.currentPlayer,
                deadline: turnState.deadline
            });
        });

        this.turnManager.on('turnEnding', (turnState) => {
            this.processTurnEnd(turnState);
        });

        this.turnManager.on('moveRejected', (data) => {
            this.io.to(this.roomId).emit('moveRejected', data);
        });

        console.log(`[GameInstance] Game ${this.id} started with ${players.length} players`);
        this.emit('gameStarted', { players });
        this.broadcastState();

        // Start first turn
        this.turnManager.startTurn();
    }

    public removePlayer(playerAddress: string, reason: string = 'disconnected'): void {
        if (!this.activePlayers.has(playerAddress)) return;

        console.log(`[GameInstance] Player ${playerAddress.slice(0, 6)}... ${reason} from game ${this.id}`);
        this.activePlayers.delete(playerAddress);
        this.lastActivityTime = Date.now();

        // Notify turn manager if game is active
        if (this.turnManager && this.status === 'ACTIVE') {
            this.turnManager.removePlayer(playerAddress);
            
            // If current player disconnected, force turn timeout
            if (this.turnManager.getCurrentPlayer() === playerAddress) {
                this.turnManager.endTurn();
            }
        }

        // Check if game should end (only 1 or fewer players remain)
        if (this.status === 'ACTIVE' && this.activePlayers.size <= 1) {
            this.status = 'ENDED';
            this.emit('gameEnded', {
                reason: 'PLAYER_ELIMINATION',
                survivors: Array.from(this.activePlayers)
            });
        }

        this.emit('playerRemoved', { playerAddress, reason });
        this.broadcastState();
    }

    /**
     * Handle player move submission. Validates move and applies physics.
     * Clear semantics: moves are validated, applied immediately, but turn duration is time-based.
     */
    public handleMove(playerAddress: string, move: MoveData): void {
        if (this.status !== 'ACTIVE' || !this.turnManager) return;

        // Validate move data structure
        const validation = this.moveValidator.validate(move);
        if (!validation.isValid) {
            console.warn(`[GameInstance] Invalid move from ${playerAddress}:`, validation.error?.message);
            this.io.to(this.roomId).emit('moveRejected', {
                playerAddress,
                error: validation.error?.toJSON()
            });
            return;
        }

        // Submit move to turn manager for validation
        const accepted = this.turnManager.submitMove(playerAddress, move);
        if (!accepted) {
            // TurnManager already emitted moveRejected
            return;
        }

        // Apply physics immediately if move is valid
        this.lastActivityTime = Date.now();
        this.physics.applyForce(move.blockIndex, move.force, move.point);

        // Emit move accepted confirmation
        this.io.to(this.roomId).emit('moveAccepted', { playerAddress });
    }

    /**
     * Process end of turn. Called by TurnManager or timeout check.
     * Handles turn advancement and validation.
     */
    private processTurnEnd(turnState: any): void {
        if (!this.turnManager || this.status !== 'ACTIVE') return;

        // Verify no more than 1 player remains
        if (this.activePlayers.size <= 1) {
            this.status = 'ENDED';
            this.emit('gameEnded', {
                reason: 'INSUFFICIENT_PLAYERS',
                survivors: Array.from(this.activePlayers)
            });
            this.broadcastState();
            return;
        }

        // Start next turn
        this.turnManager.startTurn();
    }

    public update(dt: number) {
        if (this.status !== 'ACTIVE' || !this.turnManager) return;

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

        // Check Turn Timeout (delegated to TurnManager)
        if (this.turnManager.isTimeoutReached()) {
            this.turnManager.endTurn();
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
