import { Server } from 'socket.io';
import { EventEmitter } from 'events';
import { PhysicsWorld } from '../physics';
import { BlockchainService } from '../services/blockchain';
import { GameConfig, GameState, MoveData } from './types';
import { TurnManager } from './TurnManager';
import { MoveValidator, ValidationResult } from './MoveValidator';
import { SpectatorManager } from './SpectatorManager';
import { ReconnectionManager } from './ReconnectionManager';
import { GameHistory } from './GameHistory';
import { MetricsCollector } from './MetricsCollector';
import { GameError, GameErrorCode, createGameError } from './errors';

const TURN_DURATION_MS = 30000;
const RECONNECTION_GRACE_PERIOD_MS = 30000; // 30 seconds for players to reconnect

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

    // Spectator Management (read-only observers)
    private spectatorManager: SpectatorManager = new SpectatorManager();

    // Reconnection Management (grace period for reconnecting players)
    private reconnectionManager: ReconnectionManager = new ReconnectionManager(RECONNECTION_GRACE_PERIOD_MS);

    // Game History (for replay capability)
    private gameHistory: GameHistory = new GameHistory(5000); // 5 second snapshot interval

    // Metrics Collection (for monitoring and analytics)
    private metrics: MetricsCollector;

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
        this.metrics = new MetricsCollector(id);
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

    public addPlayer(playerAddress: string, socketId: string, asSpectator: boolean = false): boolean {
        if (!this.players.includes(playerAddress)) {
            // New player/spectator joining
            if (this.status === 'WAITING' && !asSpectator) {
                // Join as active player
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
                this.metrics.recordPlayerJoined();
                this.emit('playerJoined', { playerAddress });

                // Auto-start game when enough players present
                if (this.status === 'WAITING' && this.shouldAutoStart()) {
                    this.startGame();
                }

                this.broadcastState();
                return true;
            } else if (this.status === 'ACTIVE' || asSpectator) {
                // Join as spectator (watching active game or explicitly requested)
                const success = this.spectatorManager.addSpectator(playerAddress, socketId);
                if (success) {
                    this.lastActivityTime = Date.now();
                    this.metrics.recordSpectatorJoined();
                    this.emit('spectatorJoined', { playerAddress });
                    this.broadcastState();
                }
                return success;
            } else {
                // Game ended or collapsed - no new joins
                console.warn(`[GameInstance] Cannot join game. Status: ${this.status}`);
                this.emit('playerJoinFailed', {
                    reason: 'GAME_NOT_ACCEPTING_JOINS',
                    playerAddress
                });
                return false;
            }
        } else {
            // Reconnection logic
            this.playerSockets.set(playerAddress, socketId);
            
            // Check if player reconnected within grace period
            const wasDisconnected = this.reconnectionManager.isDisconnected(playerAddress);
            if (wasDisconnected) {
                const timeRemaining = this.reconnectionManager.getTimeRemaining(playerAddress);
                if (timeRemaining > 0) {
                    // Reconnection is valid - restore player to active
                    this.reconnectionManager.markReconnected(playerAddress);
                    this.activePlayers.add(playerAddress);
                    this.metrics.recordPlayerJoined();
                    this.metrics.recordReconnectSuccess();
                    this.lastActivityTime = Date.now();
                    console.log(`[GameInstance] Player ${playerAddress} reconnected within grace period`);
                    this.emit('playerReconnected', { playerAddress });
                    // Emit to client
                    this.io.to(this.roomId).emit('playerReconnected', { playerAddress });
                    this.broadcastState();
                    return true;
                } else {
                    // Grace period expired - player stays disconnected
                    this.metrics.recordReconnectFailure();
                    console.log(`[GameInstance] Player ${playerAddress} attempted reconnect but grace period expired`);
                    this.emit('playerReconnectFailed', { playerAddress, reason: 'GRACE_PERIOD_EXPIRED' });
                    // Emit to client
                    this.io.to(this.roomId).emit('playerReconnectFailed', { playerAddress, reason: 'GRACE_PERIOD_EXPIRED' });
                    return false;
                }
            } else if (!this.activePlayers.has(playerAddress) && this.status !== 'ENDED' && this.status !== 'COLLAPSED') {
                // Player was already active (shouldn't happen but handle it)
                this.activePlayers.add(playerAddress);
                this.lastActivityTime = Date.now();
                console.log(`[GameInstance] Player ${playerAddress} re-established connection`);
                this.emit('playerReconnected', { playerAddress });
                this.broadcastState();
                return true;
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
            this.metrics.recordTurnStarted();
            this.lastActivityTime = Date.now();
            this.broadcastState();
            this.io.to(this.roomId).emit('turnChanged', {
                player: turnState.currentPlayer,
                deadline: turnState.deadline
            });
        });

        this.turnManager.on('turnEnding', (turnState) => {
            this.metrics.recordTurnEnded();
            this.processTurnEnd(turnState);
        });

        this.turnManager.on('moveRejected', (data) => {
            this.io.to(this.roomId).emit('moveRejected', data);
        });

        console.log(`[GameInstance] Game ${this.id} started with ${players.length} players`);
        
        // Record game start in history
        this.gameHistory.recordEvent('gameStarted', {
            players,
            difficulty: this.difficulty,
            stake: this.stake
        });

        this.emit('gameStarted', { players });
        this.broadcastState();

        // Start first turn
        this.turnManager.startTurn();
    }

    public removePlayer(playerAddress: string, reason: string = 'disconnected'): void {
        if (!this.activePlayers.has(playerAddress)) return;

        console.log(`[GameInstance] Player ${playerAddress.slice(0, 6)}... ${reason} from game ${this.id}`);
        this.activePlayers.delete(playerAddress);
        this.metrics.recordPlayerRemoved();
        this.lastActivityTime = Date.now();

        // Mark player as disconnected (start grace period)
        if (reason === 'disconnected') {
            this.metrics.recordDisconnect();
            // Emit reconnection event to client
            this.io.to(this.roomId).emit('playerDisconnected', { playerAddress });
        }
        this.reconnectionManager.markDisconnected(playerAddress, reason);

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
            this.endGame();
            this.emit('gameEnded', {
                reason: 'PLAYER_ELIMINATION',
                survivors: Array.from(this.activePlayers)
            });
        }

        this.emit('playerRemoved', { playerAddress, reason });
        this.broadcastState();
    }

    /**
     * Remove a spectator from the game
     */
    public removeSpectator(socketId: string): void {
        const spectator = this.spectatorManager.getSpectator(socketId);
        if (spectator) {
            this.spectatorManager.removeSpectator(socketId);
            this.metrics.recordSpectatorRemoved();
            this.lastActivityTime = Date.now();
            this.emit('spectatorRemoved', { address: spectator.address });
            this.broadcastState();
        }
    }

    /**
     * Check if a socket ID belongs to a spectator
     */
    public isSpectator(socketId: string): boolean {
        return this.spectatorManager.isSpectator(socketId);
    }

    /**
     * Get spectator count
     */
    public getSpectatorCount(): number {
        return this.spectatorManager.getSpectatorCount();
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
            this.metrics.recordMoveFailed();
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
            this.metrics.recordMoveFailed();
            return;
        }

        // Apply physics immediately if move is valid
        this.lastActivityTime = Date.now();
        this.physics.applyForce(move.blockIndex, move.force, move.point);

        // Record move in game history
        this.gameHistory.recordEvent('move', {
            playerAddress,
            blockIndex: move.blockIndex,
            force: move.force,
            point: move.point
        });

        // Record metrics
        this.metrics.recordMoveSuccess();

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
            this.endGame();
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

        // Take periodic snapshots for replay capability
        if (this.gameHistory.shouldTakeSnapshot()) {
            const physicsState = this.physics.getState();
            this.gameHistory.recordSnapshot(this.getPublicState(), physicsState);
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

        // Clean up players who exceeded reconnection grace period
        const expiredPlayers = this.reconnectionManager.getExpiredPlayers();
        for (const expiredPlayer of expiredPlayers) {
            console.log(`[GameInstance] Permanently removing ${expiredPlayer.address} - reconnection grace period expired`);
            this.reconnectionManager.removePlayer(expiredPlayer.address);
            this.players = this.players.filter(p => p !== expiredPlayer.address);
            this.playerSockets.delete(expiredPlayer.address);
            this.emit('playerPermanentlyRemoved', {
                playerAddress: expiredPlayer.address,
                reason: 'GRACE_PERIOD_EXPIRED'
            });
        }
    }

    private async handleCollapse() {
        console.log(`Game ${this.id} Collapsed!`);
        this.status = 'COLLAPSED';

        // Record collapse in game history
        this.gameHistory.recordEvent('collapse', {
            survivors: Array.from(this.activePlayers)
        });

        // Record collapse in metrics
        this.metrics.recordCollapse(this.activePlayers.size);

        // Oracle Reporting
        if (!this.isPractice) {
            try {
                await this.blockchain.reportCollapse(this.id);
            } catch (error) {
                console.error(`Failed to report collapse for game ${this.id}`, error);
            }
        }

        // End game and record final metrics
        this.endGame();

        this.io.to(this.roomId).emit('gameCollapsed', {
            survivors: Array.from(this.activePlayers)
        });
        this.broadcastState();
    }

    /**
     * Get replay data for this game
     */
    public getReplayData() {
        return this.gameHistory.exportReplayData(
            this.id,
            this.turnManager?.getState().startTime || Date.now(),
            this.status,
            Array.from(this.activePlayers)
        );
    }

    /**
     * Get game history stats
     */
    public getHistoryStats() {
        const memUsage = this.gameHistory.getMemoryUsage();
        return {
            snapshotCount: this.gameHistory.getSnapshotCount(),
            eventCount: this.gameHistory.getEventCount(),
            memoryUsage: memUsage,
            currentVersion: this.gameHistory.getCurrentVersion()
        };
    }

    /**
     * Record game end and export metrics
     */
    public endGame(): void {
        this.metrics.recordGameEnd(this.activePlayers.size);
    }

    /**
     * Get real-time metrics (lightweight, safe to call frequently)
     */
    public getRealTimeMetrics() {
        return this.metrics.getRealTimeMetrics();
    }

    /**
     * Export comprehensive game metrics (call at game end)
     */
    public exportMetrics() {
        const historyStats = this.getHistoryStats();
        return this.metrics.exportMetrics(
            this.difficulty,
            this.isPractice,
            historyStats.memoryUsage,
            historyStats.snapshotCount,
            historyStats.eventCount
        );
    }

    /**
     * Get combined replay and metrics data
     */
    public exportGameAnalytics() {
        return {
            replay: this.getReplayData(),
            metrics: this.exportMetrics(),
            historyStats: this.getHistoryStats()
        };
    }
}
