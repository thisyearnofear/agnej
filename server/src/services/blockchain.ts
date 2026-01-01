import { ethers } from 'ethers';
import { HOUSE_OF_CARDS_ABI } from '../abi';

export class BlockchainService {
    private provider: ethers.JsonRpcProvider;
    private wallet: ethers.Signer;
    private contract: ethers.Contract;

    constructor() {
        // RPC Configuration: Linea Sepolia (testnet) by default
        const rpcUrl = process.env.RPC_URL || 'https://rpc.sepolia.linea.build';
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        console.log(`[Blockchain] Using RPC: ${rpcUrl}`);

        // Oracle Private Key (required for transaction signing)
        const privateKey = process.env.ORACLE_PRIVATE_KEY;
        if (!privateKey) {
            console.warn('[Blockchain] ORACLE_PRIVATE_KEY not set. Server will be read-only.');
            // Random wallet for read-only mode
            this.wallet = ethers.Wallet.createRandom(this.provider) as unknown as ethers.Signer;
        } else {
            this.wallet = new ethers.Wallet(privateKey, this.provider);
            console.log(`[Blockchain] Wallet initialized: ${new ethers.Wallet(privateKey).address}`);
        }

        // Contract Configuration
        const contractAddress = process.env.CONTRACT_ADDRESS || '0x1DFd9003590E4A67594748Ecec18451e6cBDDD90';
        this.contract = new ethers.Contract(contractAddress, HOUSE_OF_CARDS_ABI, this.wallet);
        console.log(`[Blockchain] Contract loaded: ${contractAddress}`);
    }

    // Cache of players who have paid for specific games
    // gameId -> Set<playerAddress>
    private paidPlayers: Map<number, Set<string>> = new Map();

    public hasPlayerPaid(gameId: number, address: string): boolean {
        // For MVP: If gameId is NOT in our cache, we might assume it's a new/local game?
        // But for strict Pay-to-Play, we only return true if we saw the event.
        // However, for PRACTICE mode games (handled by GameManager), we don't check this.
        // This check is only for 'MULTIPLAYER' / 'RANKED' modes.
        const players = this.paidPlayers.get(gameId);
        return players ? players.has(address.toLowerCase()) : false;
    }

    public async listenToEvents(callbacks: {
        onPlayerJoined: (gameId: number, player: string) => void,
        onGameStarted: (gameId: number) => void,
        onTurnChanged: (gameId: number, player: string, deadline: number) => void
    }) {
        console.log('Listening to contract events...');

        this.contract.on('PlayerJoined', (gameId, player) => {
            console.log(`Event: PlayerJoined game=${gameId} player=${player}`);

            const gId = Number(gameId);
            const pAddr = player.toLowerCase();

            if (!this.paidPlayers.has(gId)) {
                this.paidPlayers.set(gId, new Set());
            }
            this.paidPlayers.get(gId)!.add(pAddr);

            callbacks.onPlayerJoined(gId, player);
        });

        this.contract.on('GameStarted', (gameId) => {
            console.log(`Event: GameStarted game=${gameId}`);
            callbacks.onGameStarted(Number(gameId));
        });

        this.contract.on('TurnChanged', (gameId, player, deadline) => {
            console.log(`Event: TurnChanged game=${gameId} player=${player}`);
            callbacks.onTurnChanged(Number(gameId), player, Number(deadline));
        });
    }

    /**
     * Report game collapse to blockchain with retry logic
     * Uses exponential backoff to handle transient failures
     * Returns true if successful, false if all retries exhausted
     */
    public async reportCollapse(gameId: number, maxRetries: number = 3): Promise<boolean> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`[Oracle] Reporting collapse for game ${gameId} (attempt ${attempt}/${maxRetries})`);
                const tx = await this.contract.reportCollapse(gameId);
                console.log(`[Oracle] Transaction sent: ${tx.hash}`);
                const receipt = await tx.wait();
                if (receipt) {
                    console.log(`[Oracle] Collapse reported on-chain. Block: ${receipt.blockNumber}`);
                    return true;
                }
            } catch (error: any) {
                const errorMsg = error?.message || 'Unknown error';
                const isRetryable = this.isRetryableError(error);
                
                console.error(
                    `[Oracle] Failed to report collapse (attempt ${attempt}/${maxRetries}): ${errorMsg}`,
                    { retryable: isRetryable }
                );

                if (attempt === maxRetries || !isRetryable) {
                    console.error(`[Oracle] Giving up on collapse report for game ${gameId}`);
                    return false;
                }

                // Exponential backoff: 1s, 2s, 4s
                const delayMs = 1000 * Math.pow(2, attempt - 1);
                console.log(`[Oracle] Retrying in ${delayMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        return false;
    }

    /**
     * Determine if an error is retryable (transient) or permanent
     * Permanent errors: invalid inputs, authentication, etc.
     * Transient errors: network timeouts, rate limits, etc.
     */
    private isRetryableError(error: any): boolean {
        const message = error?.message?.toLowerCase() || '';
        const code = error?.code;

        // Non-retryable errors
        const permanentPatterns = [
            'invalid',
            'unauthorized',
            'forbidden',
            'not found',
            'revert'
        ];

        if (permanentPatterns.some(p => message.includes(p))) {
            return false;
        }

        // Retryable error codes
        const retryableCodes = ['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'];
        if (retryableCodes.includes(code)) {
            return true;
        }

        // Default to retryable for unknown errors (network issues)
        return true;
    }
}
