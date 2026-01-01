/**
 * Centralized error definitions for game logic
 * Principle: Single source of truth for error handling
 */

export enum GameErrorCode {
    // Authentication
    AUTH_REQUIRED = 'AUTH_REQUIRED',
    AUTH_MISMATCH = 'AUTH_MISMATCH',
    PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',

    // Game State
    GAME_NOT_FOUND = 'GAME_NOT_FOUND',
    GAME_FULL = 'GAME_FULL',
    GAME_NOT_WAITING = 'GAME_NOT_WAITING',
    GAME_ALREADY_STARTED = 'GAME_ALREADY_STARTED',
    GAME_ALREADY_ENDED = 'GAME_ALREADY_ENDED',

    // Players
    PLAYER_NOT_IN_GAME = 'PLAYER_NOT_IN_GAME',
    PLAYER_ALREADY_IN_GAME = 'PLAYER_ALREADY_IN_GAME',
    PLAYER_ELIMINATED = 'PLAYER_ELIMINATED',

    // Turns
    NOT_YOUR_TURN = 'NOT_YOUR_TURN',
    TURN_TIMEOUT = 'TURN_TIMEOUT',
    MOVE_ALREADY_SUBMITTED = 'MOVE_ALREADY_SUBMITTED',
    INVALID_MOVE_DATA = 'INVALID_MOVE_DATA',

    // Blockchain
    BLOCKCHAIN_ERROR = 'BLOCKCHAIN_ERROR',
    BLOCKCHAIN_RETRY_FAILED = 'BLOCKCHAIN_RETRY_FAILED',

    // Server
    INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export class GameError extends Error {
    constructor(
        public code: GameErrorCode,
        public message: string,
        public details?: any
    ) {
        super(message);
        this.name = 'GameError';
    }

    public toJSON() {
        return {
            code: this.code,
            message: this.message,
            details: this.details
        };
    }
}

export function createGameError(
    code: GameErrorCode,
    message?: string,
    details?: any
): GameError {
    const defaultMessages: Record<GameErrorCode, string> = {
        [GameErrorCode.AUTH_REQUIRED]: 'Authentication required',
        [GameErrorCode.AUTH_MISMATCH]: 'Authentication address mismatch',
        [GameErrorCode.PAYMENT_REQUIRED]: 'Payment verification failed',
        [GameErrorCode.GAME_NOT_FOUND]: 'Game not found',
        [GameErrorCode.GAME_FULL]: 'Game is full',
        [GameErrorCode.GAME_NOT_WAITING]: 'Game is not in waiting state',
        [GameErrorCode.GAME_ALREADY_STARTED]: 'Game has already started',
        [GameErrorCode.GAME_ALREADY_ENDED]: 'Game has already ended',
        [GameErrorCode.PLAYER_NOT_IN_GAME]: 'Player is not in this game',
        [GameErrorCode.PLAYER_ALREADY_IN_GAME]: 'Player is already in this game',
        [GameErrorCode.PLAYER_ELIMINATED]: 'Player has been eliminated',
        [GameErrorCode.NOT_YOUR_TURN]: 'It is not your turn',
        [GameErrorCode.TURN_TIMEOUT]: 'Turn deadline has passed',
        [GameErrorCode.MOVE_ALREADY_SUBMITTED]: 'Move already submitted this turn',
        [GameErrorCode.INVALID_MOVE_DATA]: 'Invalid move data',
        [GameErrorCode.BLOCKCHAIN_ERROR]: 'Blockchain operation failed',
        [GameErrorCode.BLOCKCHAIN_RETRY_FAILED]: 'Blockchain operation failed after retries',
        [GameErrorCode.INTERNAL_ERROR]: 'Internal server error'
    };

    return new GameError(
        code,
        message || defaultMessages[code],
        details
    );
}
