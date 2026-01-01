import { EventEmitter } from 'events';

/**
 * TurnManager: Single source of truth for turn logic
 * 
 * Design Principles:
 * - Action-based turns: A turn ends when player submits END_TURN or timeout occurs
 * - Explicit validation: Only the current player can submit moves
 * - Clear state transitions: WAITING_FOR_MOVE -> MOVE_SUBMITTED -> TURN_ENDING
 */

export interface TurnState {
    currentPlayer: string | null;
    startTime: number;
    deadline: number;
    moveSubmitted: boolean;
    moveData: any | null;
}

export class TurnManager extends EventEmitter {
    private state: TurnState;
    private activePlayers: string[];
    private currentPlayerIndex: number = 0;
    private turnTimeoutMs: number = 30000;
    private turnInProgress: boolean = false;

    constructor(activePlayers: string[], turnTimeoutMs: number = 30000) {
        super();
        this.activePlayers = [...activePlayers];
        this.turnTimeoutMs = turnTimeoutMs;
        this.state = {
            currentPlayer: null,
            startTime: 0,
            deadline: 0,
            moveSubmitted: false,
            moveData: null
        };
    }

    /**
     * Start the next turn. Must be called explicitly.
     * Advances to next player in round-robin fashion.
     */
    public startTurn(): TurnState {
        if (this.turnInProgress) {
            console.warn('[TurnManager] Cannot start turn - already in progress');
            return this.state;
        }

        if (this.activePlayers.length === 0) {
            throw new Error('Cannot start turn with no active players');
        }

        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.activePlayers.length;
        const nextPlayer = this.activePlayers[this.currentPlayerIndex];

        const now = Date.now();
        this.state = {
            currentPlayer: nextPlayer,
            startTime: now,
            deadline: now + this.turnTimeoutMs,
            moveSubmitted: false,
            moveData: null
        };

        console.log(`[TurnManager] Turn started for ${nextPlayer}, deadline in ${this.turnTimeoutMs}ms`);
        this.emit('turnStarted', this.state);
        return this.state;
    }

    /**
     * Submit a move for the current player. Validates that:
     * 1. It's the correct player
     * 2. Turn hasn't expired
     * 3. Only one move per turn
     */
    public submitMove(playerAddress: string, moveData: any): boolean {
        if (this.state.currentPlayer !== playerAddress) {
            console.warn(`[TurnManager] Invalid move: ${playerAddress} is not current player (${this.state.currentPlayer})`);
            this.emit('moveRejected', { reason: 'NOT_YOUR_TURN', playerAddress });
            return false;
        }

        if (Date.now() > this.state.deadline) {
            console.warn(`[TurnManager] Invalid move: Turn deadline passed`);
            this.emit('moveRejected', { reason: 'DEADLINE_PASSED', playerAddress });
            return false;
        }

        if (this.state.moveSubmitted) {
            console.warn(`[TurnManager] Invalid move: Move already submitted this turn`);
            this.emit('moveRejected', { reason: 'MOVE_ALREADY_SUBMITTED', playerAddress });
            return false;
        }

        this.state.moveSubmitted = true;
        this.state.moveData = moveData;

        console.log(`[TurnManager] Move accepted from ${playerAddress}`);
        this.emit('moveAccepted', { playerAddress, moveData });
        return true;
    }

    /**
     * Explicitly end current turn. Called when:
     * - Player submits END_TURN action
     * - Turn timeout is reached
     */
    public endTurn(): TurnState {
        const moveData = this.state.moveData;
        this.turnInProgress = true;

        console.log(`[TurnManager] Turn ending for ${this.state.currentPlayer}`);
        this.emit('turnEnding', { ...this.state });

        setTimeout(() => {
            this.turnInProgress = false;
        }, 100); // Brief guard period

        return this.state;
    }

    /**
     * Handle player removal. Adjusts index if needed.
     */
    public removePlayer(playerAddress: string): void {
        const index = this.activePlayers.indexOf(playerAddress);
        if (index === -1) return;

        this.activePlayers.splice(index, 1);

        // If we removed the current player, force turn end
        if (this.state.currentPlayer === playerAddress) {
            this.state.deadline = Date.now(); // Force immediate timeout
        }

        // Adjust index if it's out of bounds
        if (this.activePlayers.length === 0) {
            this.currentPlayerIndex = 0;
        } else if (this.currentPlayerIndex >= this.activePlayers.length) {
            this.currentPlayerIndex = 0;
        }

        console.log(`[TurnManager] Removed ${playerAddress}, ${this.activePlayers.length} players remain`);
    }

    /**
     * Check if turn timeout has been reached
     */
    public isTimeoutReached(): boolean {
        return this.state.deadline > 0 && Date.now() >= this.state.deadline;
    }

    /**
     * Get current turn state (read-only snapshot)
     */
    public getState(): Readonly<TurnState> {
        return { ...this.state };
    }

    /**
     * Get list of active players
     */
    public getActivePlayers(): string[] {
        return [...this.activePlayers];
    }

    /**
     * Get current player
     */
    public getCurrentPlayer(): string | null {
        return this.state.currentPlayer;
    }

    /**
     * Get time remaining in current turn (ms)
     */
    public getTimeRemaining(): number {
        return Math.max(0, this.state.deadline - Date.now());
    }
}
