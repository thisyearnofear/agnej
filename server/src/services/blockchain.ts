import { ethers, type TransactionReceipt } from "ethers";
import { HOUSE_OF_CARDS_ABI } from "../abi";

/** Chain configuration for multi-chain support */
interface ChainConfig {
  rpcUrl: string;
  privateKey?: string;
  contractAddress: string;
}

/** Supported chains */
export type ChainName = 'linea' | 'polkadot';

const CHAIN_CONFIGS: Record<ChainName, ChainConfig> = {
  linea: {
    rpcUrl: process.env.LINEA_RPC_URL || "https://rpc.sepolia.linea.build",
    privateKey: process.env.ORACLE_PRIVATE_KEY,
    contractAddress: process.env.CONTRACT_ADDRESS || "0x1DFd9003590E4A67594748Ecec18451e6cBDDD90",
  },
  polkadot: {
    rpcUrl: process.env.POLKADOT_RPC_URL || "https://rpc.polkadot.io/testnet",
    privateKey: process.env.POLKADOT_ORACLE_PRIVATE_KEY,
    contractAddress: process.env.POLKADOT_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000001",
  },
};

export class BlockchainService {
  private providers: Map<ChainName, ethers.JsonRpcProvider>;
  private wallets: Map<ChainName, ethers.Signer>;
  private contracts: Map<ChainName, ethers.Contract>;
  private activeChain: ChainName;

  constructor() {
    this.providers = new Map();
    this.wallets = new Map();
    this.contracts = new Map();
    
    // Default to Linea
    this.activeChain = (process.env.ACTIVE_CHAIN as ChainName) || 'linea';
    
    // Initialize providers for all chains
    this.initializeChain('linea');
    this.initializeChain('polkadot');
    
    console.log(`[Blockchain] Initialized with active chain: ${this.activeChain}`);
  }

  private initializeChain(chainName: ChainName): void {
    const config = CHAIN_CONFIGS[chainName];
    
    // Initialize provider
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.providers.set(chainName, provider);
    console.log(`[Blockchain] ${chainName}: RPC connected - ${config.rpcUrl}`);

    // Initialize wallet (if private key available)
    if (config.privateKey) {
      const wallet = new ethers.Wallet(config.privateKey, provider);
      this.wallets.set(chainName, wallet);
      console.log(`[Blockchain] ${chainName}: Wallet initialized - ${wallet.address}`);
    } else {
      console.warn(`[Blockchain] ${chainName}: No ORACLE_PRIVATE_KEY set. Read-only mode.`);
    }

    // Initialize contract
    const contract = new ethers.Contract(
      config.contractAddress,
      HOUSE_OF_CARDS_ABI,
      this.wallets.get(chainName) || provider,
    );
    this.contracts.set(chainName, contract);
    console.log(`[Blockchain] ${chainName}: Contract loaded - ${config.contractAddress}`);
  }

  /** Switch active chain */
  public setActiveChain(chainName: ChainName): void {
    this.activeChain = chainName;
    console.log(`[Blockchain] Switched to chain: ${chainName}`);
  }

  /** Get current chain */
  public getActiveChain(): ChainName {
    return this.activeChain;
  }

  /** Get provider for specific chain */
  public getProvider(chainName?: ChainName): ethers.JsonRpcProvider {
    const chain = chainName || this.activeChain;
    const provider = this.providers.get(chain);
    if (!provider) {
      throw new Error(`Provider not initialized for chain: ${chain}`);
    }
    return provider;
  }

  /** Get contract for specific chain */
  public getContract(chainName?: ChainName): ethers.Contract {
    const chain = chainName || this.activeChain;
    const contract = this.contracts.get(chain);
    if (!contract) {
      throw new Error(`Contract not initialized for chain: ${chain}`);
    }
    return contract;
  }

  // Cache of players who have paid for specific games
  // gameId -> Set<playerAddress>
  private paidPlayers: Map<number, Set<string>> = new Map();

  public hasPlayerPaid(gameId: number, address: string): boolean {
    // Development mode: bypass payment verification if flag is set
    if (process.env.DEVELOPMENT_ALLOW_FREE_GAMES === 'true') {
      return true;
    }

    // For MVP: If gameId is NOT in our cache, we might assume it's a new/local game?
    // But for strict Pay-to-Play, we only return true if we saw the event.
    // However, for PRACTICE mode games (handled by GameManager), we don't check this.
    // This check is only for 'MULTIPLAYER' / 'RANKED' modes.
    const players = this.paidPlayers.get(gameId);
    return players ? players.has(address.toLowerCase()) : false;
  }

  public async listenToEvents(callbacks: {
    onPlayerJoined: (gameId: number, player: string) => void;
    onGameStarted: (gameId: number) => void;
    onTurnChanged: (gameId: number, player: string, deadline: number) => void;
  }) {
    console.log("Listening to contract events...");

    // Listen on both chains
    for (const [chainName, contract] of this.contracts) {
      console.log(`[Blockchain] Setting up listeners for ${chainName}...`);
      
      contract.on("PlayerJoined", (gameId: number | bigint, player: string) => {
        console.log(`Event [${chainName}]: PlayerJoined game=${gameId} player=${player}`);

        const gId = Number(gameId);
        const pAddr = player.toLowerCase();

        if (!this.paidPlayers.has(gId)) {
          this.paidPlayers.set(gId, new Set());
        }
        this.paidPlayers.get(gId)!.add(pAddr);

        callbacks.onPlayerJoined(gId, player);
      });

      contract.on("GameStarted", (gameId: number | bigint) => {
        console.log(`Event [${chainName}]: GameStarted game=${gameId}`);
        callbacks.onGameStarted(Number(gameId));
      });

      contract.on(
        "TurnChanged",
        (gameId: number | bigint, player: string, deadline: number | bigint) => {
          console.log(`Event [${chainName}]: TurnChanged game=${gameId} player=${player}`);
          callbacks.onTurnChanged(Number(gameId), player, Number(deadline));
        },
      );
    }
  }

  /**
   * Report game collapse to blockchain with retry logic
   * Uses exponential backoff to handle transient failures
   * Returns true if successful, false if all retries exhausted
   */
  public async reportCollapse(
    gameId: number,
    maxRetries: number = 3,
  ): Promise<boolean> {
    return this.retryContractCall(
      () => this.getContract().reportCollapse(gameId),
      `report collapse for game ${gameId}`,
      maxRetries,
    );
  }

  /**
   * Report game start to blockchain with retry logic
   */
  public async startGame(
    gameId: number,
    maxRetries: number = 3,
  ): Promise<boolean> {
    return this.retryContractCall(
      () => this.getContract().startGame(gameId),
      `start game ${gameId}`,
      maxRetries,
    );
  }

  /**
   * Report completed turn to blockchain with retry logic
   */
  public async completeTurn(
    gameId: number,
    maxRetries: number = 3,
  ): Promise<boolean> {
    return this.retryContractCall(
      () => this.getContract().completeTurn(gameId),
      `complete turn for game ${gameId}`,
      maxRetries,
    );
  }

  /**
   * Report turn timeout (and subsequent elimination) to blockchain with retry logic
   */
  public async timeoutTurn(
    gameId: number,
    maxRetries: number = 3,
  ): Promise<boolean> {
    return this.retryContractCall(
      () => this.getContract().timeoutTurn(gameId),
      `timeout turn for game ${gameId}`,
      maxRetries,
    );
  }

  /**
   * Report player elimination (surrender or disconnect) to blockchain
   */
  public async eliminatePlayer(
    gameId: number,
    playerAddress: string,
    reason: string,
    maxRetries: number = 3,
  ): Promise<boolean> {
    return this.retryContractCall(
      () => this.getContract().eliminatePlayer(gameId, playerAddress, reason),
      `eliminate player ${playerAddress} from game ${gameId} (reason: ${reason})`,
      maxRetries,
    );
  }

  /**
   * Generic wrapper for contract calls with exponential backoff retry logic
   */
  private async retryContractCall(
    call: () => Promise<{ hash: string; wait: () => Promise<TransactionReceipt | null> }>,
    description: string,
    maxRetries: number,
  ): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `[Oracle] Attempting to ${description} (attempt ${attempt}/${maxRetries})`,
        );
        const tx = await call();
        console.log(`[Oracle] Transaction sent: ${tx.hash}`);
        const receipt = await tx.wait();
        if (receipt) {
          console.log(
            `[Oracle] Success: ${description}. Block: ${receipt.blockNumber}`,
          );
          return true;
        }
      } catch (error: unknown) {
        const err = error as { message?: string; code?: string };
        const errorMsg = err?.message || "Unknown error";
        const isRetryable = this.isRetryableError(err);

        console.error(
          `[Oracle] Failed to ${description} (attempt ${attempt}/${maxRetries}): ${errorMsg}`,
          { retryable: isRetryable },
        );

        if (attempt === maxRetries || !isRetryable) {
          console.error(`[Oracle] Giving up on: ${description}`);
          return false;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delayMs = 1000 * Math.pow(2, attempt - 1);
        console.log(`[Oracle] Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
    return false;
  }

  /**
   * Determine if an error is retryable (transient) or permanent
   * Permanent errors: invalid inputs, authentication, etc.
   * Transient errors: network timeouts, rate limits, etc.
   */
  private isRetryableError(error: unknown): boolean {
    const err = error as { message?: string; code?: string };
    const message = err?.message?.toLowerCase() || "";
    const code = err?.code;

    // Non-retryable errors
    const permanentPatterns = [
      "invalid",
      "unauthorized",
      "forbidden",
      "not found",
      "revert",
    ];

    if (permanentPatterns.some((p) => message.includes(p))) {
      return false;
    }

    // Retryable error codes
    const retryableCodes = ["ETIMEDOUT", "ECONNREFUSED", "ENOTFOUND"];
    if (code && retryableCodes.includes(code as string)) {
      return true;
    }

    // Default to retryable for unknown errors (network issues)
    return true;
  }
}
