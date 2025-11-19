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

    public async listenToEvents(callbacks: {
        onPlayerJoined: (gameId: number, player: string) => void,
        onGameStarted: (gameId: number) => void,
        onTurnChanged: (gameId: number, player: string, deadline: number) => void
    }) {
        console.log('Listening to contract events...');

        this.contract.on('PlayerJoined', (gameId, player) => {
            console.log(`Event: PlayerJoined game=${gameId} player=${player}`);
            callbacks.onPlayerJoined(Number(gameId), player);
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

    public async completeTurn(gameId: number) {
        try {
            console.log(`Oracle: Completing turn for game ${gameId}`);
            const tx = await this.contract.completeTurn(gameId);
            await tx.wait();
            console.log('Oracle: Turn completed on-chain');
        } catch (error) {
            console.error('Oracle Error (completeTurn):', error);
        }
    }

    public async reportCollapse(gameId: number) {
        try {
            console.log(`Oracle: Reporting collapse for game ${gameId}`);
            const tx = await this.contract.reportCollapse(gameId);
            await tx.wait();
            console.log('Oracle: Collapse reported on-chain');
        } catch (error) {
            console.error('Oracle Error (reportCollapse):', error);
        }
    }
}
