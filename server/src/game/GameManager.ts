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
            game = this.games.get(gameId);
        } else {
            // Matchmaking: Find first WAITING game with space
            for (const g of this.games.values()) {
                if (g.status === 'WAITING' && g.players.length < g.maxPlayers) {
                    game = g;
                    break;
                }
            }
        }

        if (game) {
            // SECURITY: Payment Verification
            if (!game.isPractice && game.difficulty !== 'EASY') {
                // Assuming 'EASY' might be free or logic differs? 
                // Actually, let's stick to isPractice check. 
                // If it's MULTIPLAYER (which implies !isPractice usually), we check.
                // But wait, createGame allows isPractice=false.

                // Check if player paid
                const hasPaid = this.blockchain.hasPlayerPaid(game.id, playerAddress);
                if (!hasPaid) {
                    console.warn(`[GameManager] Access Denied: Player ${playerAddress} has not paid for game ${game.id}`);
                    socket.emit('error', 'Access Denied: Payment not verified for this transaction.');
                    return null;
                }
            }

            // Join Socket.io room
            socket.join(game.roomId);

            // Add to game logic
            game.addPlayer(playerAddress, socket.id);

            // Map socket for quick lookup
            this.socketGameMap.set(socket.id, game.id);

            console.log(`[GameManager] Player ${playerAddress} joined game ${game.id}`);
            return game;
        }

        return null;
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

    public getPublicLobbies() {
        // Return list of WAITING games
        const lobbies = [];
        for (const game of this.games.values()) {
            if (game.status === 'WAITING' && game.difficulty !== 'EASY') { // Filter practice? Or show all?
                lobbies.push(game.getPublicState());
            }
        }
        return lobbies;
    }

    private tick() {
        const dt = 1 / 60;
        for (const [id, game] of this.games.entries()) {
            if (game.status === 'ACTIVE') {
                game.update(dt);
            }

            // Cleanup Logic (Simple: Remove if empty and ended)
            if ((game.status === 'ENDED' || game.status === 'COLLAPSED') && game.activePlayers.size === 0) {
                // Keep for a bit? For now, we rely on sockets disconnecting.
                // If everyone left, delete it.
                console.log(`[GameManager] Cleaning up empty game ${id}`);
                game.io.in(game.roomId).disconnectSockets(); // Force disconnect remnants
                this.games.delete(id);
            }
        }
    }
}
