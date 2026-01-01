/**
 * SpectatorManager: Manages spectators who watch active games
 * 
 * Design: Spectators are read-only observers who:
 * - Can join games in progress (unlike players)
 * - Receive all game state and physics updates
 * - Cannot submit moves or affect game state
 * - Are automatically removed if parent game ends
 */

import { EventEmitter } from 'events';

export interface SpectatorState {
    address: string;
    socketId: string;
    joinedAt: number;
}

export class SpectatorManager extends EventEmitter {
    private spectators: Map<string, SpectatorState> = new Map(); // socketId -> SpectatorState
    private addressToSocket: Map<string, string> = new Map(); // address -> socketId (for lookup)

    /**
     * Add a spectator to the game
     */
    public addSpectator(address: string, socketId: string): boolean {
        if (this.spectators.has(socketId)) {
            console.warn(`[SpectatorManager] Spectator ${socketId} already exists`);
            return false;
        }

        const spectator: SpectatorState = {
            address,
            socketId,
            joinedAt: Date.now()
        };

        this.spectators.set(socketId, spectator);
        this.addressToSocket.set(address, socketId);

        console.log(`[SpectatorManager] Spectator ${address} joined. Total: ${this.spectators.size}`);
        this.emit('spectatorJoined', spectator);
        return true;
    }

    /**
     * Remove a spectator
     */
    public removeSpectator(socketId: string): boolean {
        const spectator = this.spectators.get(socketId);
        if (!spectator) return false;

        this.spectators.delete(socketId);
        this.addressToSocket.delete(spectator.address);

        console.log(`[SpectatorManager] Spectator ${spectator.address.slice(0, 6)}... left. Total: ${this.spectators.size}`);
        this.emit('spectatorRemoved', spectator);
        return true;
    }

    /**
     * Get a spectator by socket ID
     */
    public getSpectator(socketId: string): SpectatorState | undefined {
        return this.spectators.get(socketId);
    }

    /**
     * Get all spectators
     */
    public getAllSpectators(): SpectatorState[] {
        return Array.from(this.spectators.values());
    }

    /**
     * Check if a socket ID is a spectator
     */
    public isSpectator(socketId: string): boolean {
        return this.spectators.has(socketId);
    }

    /**
     * Get spectator count
     */
    public getSpectatorCount(): number {
        return this.spectators.size;
    }

    /**
     * Clear all spectators (useful for cleanup)
     */
    public clear(): void {
        const count = this.spectators.size;
        this.spectators.clear();
        this.addressToSocket.clear();
        console.log(`[SpectatorManager] Cleared ${count} spectators`);
    }

    /**
     * Get spectator info for broadcasting
     */
    public getPublicState(): { count: number; addresses: string[] } {
        return {
            count: this.spectators.size,
            addresses: Array.from(this.spectators.values()).map(s => s.address)
        };
    }
}
