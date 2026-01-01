import { Server, Socket } from 'socket.io';
import { GameInstance } from './GameInstance';
import { GameConfig, MoveData } from './types';
import { BlockchainService } from '../services/blockchain';

export class GameManager {
    private games: Map<number, GameInstance> = new Map();
    private socketGameMap: Map<string, number> = new Map(); // socketId -> gameId

    constructor(private io: Server, private blockchain: BlockchainService) {
        // Start Global Loop (60 FPS)
        setInterval(() => this.tick(), 1000 / 60);
    }

    public createGame(config: GameConfig): GameInstance {
        const id = Date.now();
        const game = new GameInstance(id, config, this.io, this.blockchain);
        this.games.set(id, game);
        console.log(`[GameManager] Game ${id} created.`);
        return game;
    }

    public joinGame(socket: Socket, playerAddress: string, gameId?: number): GameInstance | null {
        let game: GameInstance | undefined;

        if (gameId) {
            // Join specific game by ID
            game = this.games.get(gameId);
            if (!game) {
                console.warn(`[GameManager] Game ${gameId} not found`);
                socket.emit('error', 'Game not found.');
                return null;
            }
        } else {
            // Auto-matchmaking: Find first WAITING game with space
            game = this.findAvailableGame();
            if (!game) {
                console.log(`[GameManager] No available games for ${playerAddress}. Player should create one.`);
                socket.emit('error', 'No available games. Please create one.');
                return null;
            }
        }

        // Payment verification for ranked games
        if (!game.isPractice && game.difficulty !== 'EASY') {
            const hasPaid = this.blockchain.hasPlayerPaid(game.id, playerAddress);
            if (!hasPaid) {
                console.warn(`[GameManager] Access Denied: Player ${playerAddress} has not paid for game ${game.id}`);
                socket.emit('error', 'Access Denied: Payment not verified.');
                return null;
            }
        }

        // Join Socket.io room
        socket.join(game.roomId);

        // Add to game logic
        const success = game.addPlayer(playerAddress, socket.id);
        if (!success) {
            socket.leave(game.roomId);
            socket.emit('error', 'Could not join game. Game full or not accepting players.');
            return null;
        }

        // Map socket for quick lookup
        this.socketGameMap.set(socket.id, game.id);

        console.log(`[GameManager] Player ${playerAddress} joined game ${game.id}`);
        return game;
    }

    /**
     * Find the first available game for auto-matchmaking
     * DRY principle: Single source for matchmaking logic
     */
    private findAvailableGame(): GameInstance | undefined {
        for (const game of this.games.values()) {
            if (game.status === 'WAITING' && 
                !game.isPractice && 
                game.players.length < game.maxPlayers) {
                return game;
            }
        }
        return undefined;
    }

    public handleDisconnect(socketId: string) {
        const gameId = this.socketGameMap.get(socketId);
        if (gameId) {
            const game = this.games.get(gameId);
            if (game) {
                // Find address by socketId
                for (const [addr, sId] of game.playerSockets.entries()) {
                    if (sId === socketId) {
                        game.removePlayer(addr, 'disconnected');
                        break;
                    }
                }
            }
            this.socketGameMap.delete(socketId);
        }
    }

    public handleMove(socketId: string, moveData: MoveData) {
        const gameId = this.socketGameMap.get(socketId);
        if (gameId) {
            const game = this.games.get(gameId);
            if (game) {
                // Find player address
                for (const [addr, sId] of game.playerSockets.entries()) {
                    if (sId === socketId) {
                        game.handleMove(addr, moveData);
                        break;
                    }
                }
            }
        }
    }

    public handleSurrender(socketId: string) {
        const gameId = this.socketGameMap.get(socketId);
        if (gameId) {
            const game = this.games.get(gameId);
            if (game) {
                for (const [addr, sId] of game.playerSockets.entries()) {
                    if (sId === socketId) {
                        game.removePlayer(addr, 'surrendered');
                        break;
                    }
                }
            }
        }
    }

    /**
     * Get all public lobbies available for joining
     * Only returns games that are waiting and not practice
     */
    public getPublicLobbies() {
        const lobbies = [];
        for (const game of this.games.values()) {
            if (game.status === 'WAITING' && game.difficulty !== 'EASY') { // Filter practice? Or show all?
                lobbies.push(game.getPublicState());
            }
        }
        return lobbies;
    }

    /**
     * Main game loop: update all active games and clean up stale ones
     * Cleanup follows configurable retention policies
     */
    private tick() {
        const dt = 1 / 60;
        for (const [id, game] of this.games.entries()) {
            if (game.status === 'ACTIVE') {
                game.update(dt);
            }

            // Cleanup Logic: Remove stale games based on status and inactivity
            const now = Date.now();
            const inactiveTime = now - game.lastActivityTime;
            let shouldDelete = false;

            // 1. Finished Games: Keep for 5 minutes for results/replay
            if ((game.status === 'ENDED' || game.status === 'COLLAPSED') && inactiveTime > 5 * 60 * 1000) {
                console.log(`[GameManager] Cleaning up finished game ${id} (result retention expired)`);
                shouldDelete = true;
            }

            // 2. Waiting Games: Keep for 15 minutes if nothing happens
            if (game.status === 'WAITING' && inactiveTime > 15 * 60 * 1000) {
                console.log(`[GameManager] Cleaning up stale lobby ${id}`);
                shouldDelete = true;
            }

            // 3. Abandoned Games: If all players left, give 1 minute grace period for reconnect
            if (game.activePlayers.size === 0 && inactiveTime > 60 * 1000) {
                // But wait, if it's WAITING and has 0 players, is it abandoned? Yes.
                // If it's ACTIVE and 0 players, it's definitely abandoned.
                console.log(`[GameManager] Cleaning up abandoned game ${id}`);
                shouldDelete = true;
            }

            if (shouldDelete) {
                game.io.in(game.roomId).disconnectSockets(); // Force disconnect remnants
                this.games.delete(id);
            }
        }
    }
}
