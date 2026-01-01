/**
 * MetricsCollector: Aggregates and tracks game metrics for monitoring
 * 
 * Design: Collects metrics from all game events and provides:
 * - Real-time metrics during gameplay
 * - Aggregated statistics at game end
 * - Dashboard-ready JSON export
 * - Memory and performance tracking
 */

import { EventEmitter } from 'events';

export interface GameMetrics {
    // Game info
    gameId: number;
    difficulty: string;
    isPractice: boolean;
    startTime: number;
    endTime?: number;
    duration?: number;

    // Player metrics
    playerCount: number;
    spectatorCount: number;
    finalActivePlayers: number;

    // Turn metrics
    turnCount: number;
    avgTurnDuration: number;
    longestTurn: number;
    shortestTurn: number;

    // Move metrics
    totalMoves: number;
    successfulMoves: number;
    failedMoves: number;
    moveSuccessRate: number;

    // Reconnection metrics
    disconnectEvents: number;
    reconnectSuccesses: number;
    reconnectFailures: number;
    reconnectSuccessRate: number;

    // Collapse metrics
    collapsed: boolean;
    collapseTime?: number;

    // Resource metrics
    snapshotCount: number;
    eventCount: number;
    memoryUsage: {
        snapshots: number;
        events: number;
        total: number;
    };
}

export class MetricsCollector extends EventEmitter {
    private gameId: number;
    private startTime: number = Date.now();
    private endTime?: number;

    // Player tracking
    private playerCount: number = 0;
    private spectatorCount: number = 0;
    private finalActivePlayers: number = 0;

    // Turn tracking
    private turnCount: number = 0;
    private turnDurations: number[] = [];
    private currentTurnStartTime?: number;

    // Move tracking
    private totalMoves: number = 0;
    private successfulMoves: number = 0;
    private failedMoves: number = 0;

    // Reconnection tracking
    private disconnectEvents: number = 0;
    private reconnectSuccesses: number = 0;
    private reconnectFailures: number = 0;

    // Collapse tracking
    private collapsed: boolean = false;
    private collapseTime?: number;

    constructor(gameId: number) {
        super();
        this.gameId = gameId;
    }

    /**
     * Record player joined
     */
    public recordPlayerJoined(): void {
        this.playerCount++;
    }

    /**
     * Record player removed
     */
    public recordPlayerRemoved(): void {
        if (this.playerCount > 0) this.playerCount--;
    }

    /**
     * Record spectator joined
     */
    public recordSpectatorJoined(): void {
        this.spectatorCount++;
    }

    /**
     * Record spectator removed
     */
    public recordSpectatorRemoved(): void {
        if (this.spectatorCount > 0) this.spectatorCount--;
    }

    /**
     * Record turn started
     */
    public recordTurnStarted(): void {
        this.turnCount++;
        this.currentTurnStartTime = Date.now();
    }

    /**
     * Record turn ended
     */
    public recordTurnEnded(): void {
        if (this.currentTurnStartTime) {
            const duration = Date.now() - this.currentTurnStartTime;
            this.turnDurations.push(duration);
            this.currentTurnStartTime = undefined;
        }
    }

    /**
     * Record successful move
     */
    public recordMoveSuccess(): void {
        this.totalMoves++;
        this.successfulMoves++;
    }

    /**
     * Record failed move
     */
    public recordMoveFailed(): void {
        this.totalMoves++;
        this.failedMoves++;
    }

    /**
     * Record disconnect event
     */
    public recordDisconnect(): void {
        this.disconnectEvents++;
    }

    /**
     * Record successful reconnection
     */
    public recordReconnectSuccess(): void {
        this.reconnectSuccesses++;
    }

    /**
     * Record failed reconnection
     */
    public recordReconnectFailure(): void {
        this.reconnectFailures++;
    }

    /**
     * Record tower collapse
     */
    public recordCollapse(finalActivePlayers: number): void {
        this.collapsed = true;
        this.collapseTime = Date.now() - this.startTime;
        this.finalActivePlayers = finalActivePlayers;
    }

    /**
     * Record game end
     */
    public recordGameEnd(finalActivePlayers: number): void {
        this.endTime = Date.now();
        this.finalActivePlayers = finalActivePlayers;
    }

    /**
     * Calculate average turn duration
     */
    private getAvgTurnDuration(): number {
        if (this.turnDurations.length === 0) return 0;
        const sum = this.turnDurations.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.turnDurations.length);
    }

    /**
     * Get longest turn
     */
    private getLongestTurn(): number {
        return this.turnDurations.length > 0 ? Math.max(...this.turnDurations) : 0;
    }

    /**
     * Get shortest turn
     */
    private getShortestTurn(): number {
        return this.turnDurations.length > 0 ? Math.min(...this.turnDurations) : 0;
    }

    /**
     * Calculate move success rate
     */
    private getMoveSuccessRate(): number {
        if (this.totalMoves === 0) return 0;
        return Math.round((this.successfulMoves / this.totalMoves) * 100);
    }

    /**
     * Calculate reconnect success rate
     */
    private getReconnectSuccessRate(): number {
        const totalReconnectAttempts = this.reconnectSuccesses + this.reconnectFailures;
        if (totalReconnectAttempts === 0) return 0;
        return Math.round((this.reconnectSuccesses / totalReconnectAttempts) * 100);
    }

    /**
     * Get game duration
     */
    private getDuration(): number | undefined {
        if (!this.endTime) return undefined;
        return this.endTime - this.startTime;
    }

    /**
     * Export metrics as dashboard-ready JSON
     */
    public exportMetrics(
        difficulty: string,
        isPractice: boolean,
        memoryUsage: { snapshots: number; events: number; total: number },
        snapshotCount: number,
        eventCount: number
    ): GameMetrics {
        return {
            gameId: this.gameId,
            difficulty,
            isPractice,
            startTime: this.startTime,
            endTime: this.endTime,
            duration: this.getDuration(),
            playerCount: this.playerCount,
            spectatorCount: this.spectatorCount,
            finalActivePlayers: this.finalActivePlayers,
            turnCount: this.turnCount,
            avgTurnDuration: this.getAvgTurnDuration(),
            longestTurn: this.getLongestTurn(),
            shortestTurn: this.getShortestTurn(),
            totalMoves: this.totalMoves,
            successfulMoves: this.successfulMoves,
            failedMoves: this.failedMoves,
            moveSuccessRate: this.getMoveSuccessRate(),
            disconnectEvents: this.disconnectEvents,
            reconnectSuccesses: this.reconnectSuccesses,
            reconnectFailures: this.reconnectFailures,
            reconnectSuccessRate: this.getReconnectSuccessRate(),
            collapsed: this.collapsed,
            collapseTime: this.collapseTime,
            snapshotCount,
            eventCount,
            memoryUsage
        };
    }

    /**
     * Get real-time metrics (lightweight)
     */
    public getRealTimeMetrics() {
        return {
            gameId: this.gameId,
            elapsed: Date.now() - this.startTime,
            playerCount: this.playerCount,
            spectatorCount: this.spectatorCount,
            turnCount: this.turnCount,
            totalMoves: this.totalMoves,
            moveSuccessRate: this.getMoveSuccessRate(),
            collapsed: this.collapsed
        };
    }

    /**
     * Reset metrics (for testing)
     */
    public reset(): void {
        this.startTime = Date.now();
        this.endTime = undefined;
        this.playerCount = 0;
        this.spectatorCount = 0;
        this.finalActivePlayers = 0;
        this.turnCount = 0;
        this.turnDurations = [];
        this.currentTurnStartTime = undefined;
        this.totalMoves = 0;
        this.successfulMoves = 0;
        this.failedMoves = 0;
        this.disconnectEvents = 0;
        this.reconnectSuccesses = 0;
        this.reconnectFailures = 0;
        this.collapsed = false;
        this.collapseTime = undefined;
    }
}
