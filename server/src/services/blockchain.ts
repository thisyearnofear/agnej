import { ethers } from 'ethers';
import { HOUSE_OF_CARDS_ABI } from '../abi';

export class BlockchainService {
    private provider: ethers.JsonRpcProvider;
    private wallet: ethers.Signer;
    private contract: ethers.Contract;

    constructor() {
        // Use Linea Sepolia RPC
        const rpcUrl = process.env.RPC_URL || 'https://rpc.sepolia.linea.build';
        this.provider = new ethers.JsonRpcProvider(rpcUrl);

        // Oracle Private Key (In prod, use a secure secret manager)
        // For now, we'll use a dummy key or expect it in env
        const privateKey = process.env.ORACLE_PRIVATE_KEY;
        if (!privateKey) {
            console.warn('No ORACLE_PRIVATE_KEY provided. Read-only mode.');
            // Random wallet for read-only
            this.wallet = ethers.Wallet.createRandom(this.provider) as unknown as ethers.Signer;
        } else {
            this.wallet = new ethers.Wallet(privateKey, this.provider);
        }

        const contractAddress = process.env.CONTRACT_ADDRESS || '0x1DFd9003590E4A67594748Ecec18451e6cBDDD90';
        this.contract = new ethers.Contract(contractAddress, HOUSE_OF_CARDS_ABI, this.wallet);

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

    // For MVP: Simplified reporting that only calls blockchain on game conclusion
    public async reportCollapse(gameId: number, maxRetries: number = 3): Promise<boolean> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`Oracle: Reporting collapse for game ${gameId} (attempt ${attempt}/${maxRetries})`);
                const tx = await this.contract.reportCollapse(gameId);
                console.log(`Oracle: Transaction sent: ${tx.hash}`);
                await tx.wait();
                console.log('Oracle: Collapse reported on-chain');
                return true;
            } catch (error: any) {
                console.error(`Oracle Error (reportCollapse attempt ${attempt}):`, error.message);
                if (attempt === maxRetries) {
                    console.error(`Oracle: Failed to report collapse after ${maxRetries} attempts`);
                    return false;
                }
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
        return false;
    }
}
