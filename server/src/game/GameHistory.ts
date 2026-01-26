/**
 * GameHistory: Records game state snapshots and events for replay capability
 * 
 * Design: Maintains a versioned history of game state
 * - Takes periodic snapshots of game state
 * - Records all moves and events
 * - Allows reconstruction of game from any point
 * - Supports replay of recorded games
 */

import { GameState } from './types';

export interface GameSnapshot {
    version: number;
    timestamp: number;
    gameState: GameState;
    physicsState: unknown;
}

export interface GameEvent {
    version: number;
    timestamp: number;
    type: 'move' | 'turnChanged' | 'collapse' | 'playerJoined' | 'playerRemoved' | 'gameStarted' | 'gameEnded';
    data: Record<string, unknown>;
}

export interface GameReplayData {
    gameId: number;
    startTime: number;
    endTime: number;
    snapshots: GameSnapshot[];
    events: GameEvent[];
    finalStatus: string;
    survivors: string[];
}

export class GameHistory {
    private snapshots: GameSnapshot[] = [];
    private events: GameEvent[] = [];
    private currentVersion: number = 0;
    private snapshotInterval: number = 5000; // 5 seconds between snapshots
    private lastSnapshotTime: number = Date.now();

    constructor(snapshotIntervalMs: number = 5000) {
        this.snapshotInterval = snapshotIntervalMs;
    }

    /**
     * Record a game snapshot
     */
    public recordSnapshot(gameState: GameState, physicsState: unknown): GameSnapshot {
        const snapshot: GameSnapshot = {
            version: this.currentVersion++,
            timestamp: Date.now(),
            gameState: { ...gameState },
            physicsState: physicsState
        };

        this.snapshots.push(snapshot);
        this.lastSnapshotTime = snapshot.timestamp;
        return snapshot;
    }

    /**
     * Record a game event
     */
    public recordEvent(
        type: GameEvent['type'],
        data: Record<string, unknown>
    ): GameEvent {
        const event: GameEvent = {
            version: this.currentVersion,
            timestamp: Date.now(),
            type,
            data
        };

        this.events.push(event);
        return event;
    }

    /**
     * Check if it's time to take a snapshot
     */
    public shouldTakeSnapshot(): boolean {
        return (Date.now() - this.lastSnapshotTime) >= this.snapshotInterval;
    }

    /**
     * Get all snapshots
     */
    public getSnapshots(): GameSnapshot[] {
        return [...this.snapshots];
    }

    /**
     * Get all events
     */
    public getEvents(): GameEvent[] {
        return [...this.events];
    }

    /**
     * Get snapshot by version
     */
    public getSnapshotByVersion(version: number): GameSnapshot | undefined {
        return this.snapshots.find(s => s.version === version);
    }

    /**
     * Get snapshots between time range
     */
    public getSnapshotsBetween(startTime: number, endTime: number): GameSnapshot[] {
        return this.snapshots.filter(s => s.timestamp >= startTime && s.timestamp <= endTime);
    }

    /**
     * Get events between time range
     */
    public getEventsBetween(startTime: number, endTime: number): GameEvent[] {
        return this.events.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
    }

    /**
     * Get events of specific type
     */
    public getEventsByType(type: GameEvent['type']): GameEvent[] {
        return this.events.filter(e => e.type === type);
    }

    /**
     * Get snapshot count
     */
    public getSnapshotCount(): number {
        return this.snapshots.length;
    }

    /**
     * Get event count
     */
    public getEventCount(): number {
        return this.events.length;
    }

    /**
     * Export full replay data
     */
    public exportReplayData(
        gameId: number,
        startTime: number,
        finalStatus: string,
        survivors: string[]
    ): GameReplayData {
        const endTime = Date.now();
        return {
            gameId,
            startTime,
            endTime,
            snapshots: this.getSnapshots(),
            events: this.getEvents(),
            finalStatus,
            survivors
        };
    }

    /**
     * Get memory usage estimate (rough)
     */
    public getMemoryUsage(): { snapshots: number; events: number; total: number } {
        const snapshotSize = this.snapshots.length * 1000; // Rough estimate: 1KB per snapshot
        const eventSize = this.events.length * 200; // Rough estimate: 200B per event
        return {
            snapshots: snapshotSize,
            events: eventSize,
            total: snapshotSize + eventSize
        };
    }

    /**
     * Clear history (cleanup)
     */
    public clear(): void {
        this.snapshots = [];
        this.events = [];
        this.currentVersion = 0;
    }

    /**
     * Get current version
     */
    public getCurrentVersion(): number {
        return this.currentVersion;
    }

    /**
     * Get last snapshot
     */
    public getLastSnapshot(): GameSnapshot | undefined {
        return this.snapshots[this.snapshots.length - 1];
    }

    /**
     * Get last event
     */
    public getLastEvent(): GameEvent | undefined {
        return this.events[this.events.length - 1];
    }
}
