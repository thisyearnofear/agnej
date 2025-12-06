export interface GameConfig {
    maxPlayers: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    stake: number;
    isPractice: boolean;
}

export interface GameState {
    id: number;
    players: string[]; // Wallet addresses
    currentPlayerIndex: number;
    currentPlayer: string | null;
    status: 'WAITING' | 'ACTIVE' | 'ENDED' | 'COLLAPSED';
    maxPlayers: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    stake: number;
    isPractice: boolean;
    turnStartTime: number;
    turnDeadline: number;
    activePlayers: string[]; // Changed from Set for serialization ease in types, assume internal Set
}

export interface MoveData {
    blockIndex: number;
    force: { x: number, y: number, z: number };
    point: { x: number, y: number, z: number };
}
