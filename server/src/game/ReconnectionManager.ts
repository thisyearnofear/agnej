/**
 * ReconnectionManager: Manages player reconnection grace periods
 * 
 * Design: Players have a configurable window to reconnect after disconnection
 * - Tracks disconnection time for each player
 * - Allows reconnection within grace period
 * - Removes player if grace period expires
 * - Emits events for timeout and successful reconnection
 */

import { EventEmitter } from 'events';

export interface DisconnectedPlayer {
    address: string;
    disconnectedAt: number;
    reason: string;
}

export class ReconnectionManager extends EventEmitter {
    private disconnectedPlayers: Map<string, DisconnectedPlayer> = new Map(); // address -> DisconnectedPlayer
    private gracePeriodMs: number = 30000; // 30 seconds default

    constructor(gracePeriodMs: number = 30000) {
        super();
        this.gracePeriodMs = gracePeriodMs;
    }

    /**
     * Mark a player as disconnected
     */
    public markDisconnected(playerAddress: string, reason: string = 'disconnected'): void {
        if (this.disconnectedPlayers.has(playerAddress)) {
            console.warn(`[ReconnectionManager] Player ${playerAddress} already marked as disconnected`);
            return;
        }

        const disconnected: DisconnectedPlayer = {
            address: playerAddress,
            disconnectedAt: Date.now(),
            reason
        };

        this.disconnectedPlayers.set(playerAddress, disconnected);
        console.log(`[ReconnectionManager] Player ${playerAddress} marked disconnected. Grace period: ${this.gracePeriodMs}ms`);
        this.emit('playerDisconnected', disconnected);
    }

    /**
     * Mark a player as reconnected (clears the disconnected flag)
     */
    public markReconnected(playerAddress: string): boolean {
        if (!this.disconnectedPlayers.has(playerAddress)) {
            return false;
        }

        const disconnected = this.disconnectedPlayers.get(playerAddress)!;
        const reconnectTime = Date.now() - disconnected.disconnectedAt;

        this.disconnectedPlayers.delete(playerAddress);
        console.log(`[ReconnectionManager] Player ${playerAddress} reconnected after ${reconnectTime}ms`);
        this.emit('playerReconnected', { playerAddress, disconnectDuration: reconnectTime });
        return true;
    }

    /**
     * Check if a player has timed out and return those who have
     */
    public getExpiredPlayers(): DisconnectedPlayer[] {
        const now = Date.now();
        const expired: DisconnectedPlayer[] = [];

        for (const [address, info] of this.disconnectedPlayers.entries()) {
            const timeElapsed = now - info.disconnectedAt;
            if (timeElapsed >= this.gracePeriodMs) {
                expired.push(info);
            }
        }

        return expired;
    }

    /**
     * Remove a player from the disconnected list (cleanup)
     */
    public removePlayer(playerAddress: string): boolean {
        const removed = this.disconnectedPlayers.delete(playerAddress);
        if (removed) {
            console.log(`[ReconnectionManager] Removed ${playerAddress} from tracking`);
        }
        return removed;
    }

    /**
     * Check if a player is currently disconnected
     */
    public isDisconnected(playerAddress: string): boolean {
        return this.disconnectedPlayers.has(playerAddress);
    }

    /**
     * Get disconnection info
     */
    public getDisconnectionInfo(playerAddress: string): DisconnectedPlayer | undefined {
        return this.disconnectedPlayers.get(playerAddress);
    }

    /**
     * Get time remaining for reconnection
     */
    public getTimeRemaining(playerAddress: string): number {
        const info = this.disconnectedPlayers.get(playerAddress);
        if (!info) return 0;

        const elapsed = Date.now() - info.disconnectedAt;
        return Math.max(0, this.gracePeriodMs - elapsed);
    }

    /**
     * Get all disconnected players
     */
    public getAllDisconnected(): DisconnectedPlayer[] {
        return Array.from(this.disconnectedPlayers.values());
    }

    /**
     * Clear all disconnected players (cleanup)
     */
    public clear(): void {
        const count = this.disconnectedPlayers.size;
        this.disconnectedPlayers.clear();
        console.log(`[ReconnectionManager] Cleared ${count} disconnected players`);
    }

    /**
     * Set grace period (in milliseconds)
     */
    public setGracePeriod(ms: number): void {
        this.gracePeriodMs = ms;
        console.log(`[ReconnectionManager] Grace period set to ${ms}ms`);
    }

    /**
     * Get grace period
     */
    public getGracePeriod(): number {
        return this.gracePeriodMs;
    }
}
