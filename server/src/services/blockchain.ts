import { ethers, type TransactionReceipt } from "ethers";
import { HOUSE_OF_CARDS_ABI } from "../abi";

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Signer;
  private contract: ethers.Contract;

  constructor() {
    // RPC Configuration: Linea Sepolia (testnet) by default
    const rpcUrl = process.env.RPC_URL || "https://rpc.sepolia.linea.build";
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    console.log(`[Blockchain] Using RPC: ${rpcUrl}`);

    // Oracle Private Key (required for transaction signing)
    const privateKey = process.env.ORACLE_PRIVATE_KEY;
    if (!privateKey) {
      console.warn(
        "[Blockchain] ORACLE_PRIVATE_KEY not set. Server will be read-only.",
      );
      // Random wallet for read-only mode
      this.wallet = ethers.Wallet.createRandom(
        this.provider,
      ) as unknown as ethers.Signer;
    } else {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      console.log(
        `[Blockchain] Wallet initialized: ${new ethers.Wallet(privateKey).address}`,
      );
    }

    // Contract Configuration
    const contractAddress =
      process.env.CONTRACT_ADDRESS ||
      "0x1DFd9003590E4A67594748Ecec18451e6cBDDD90";
    this.contract = new ethers.Contract(
      contractAddress,
      HOUSE_OF_CARDS_ABI,
      this.wallet,
    );
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
    onPlayerJoined: (gameId: number, player: string) => void;
    onGameStarted: (gameId: number) => void;
    onTurnChanged: (gameId: number, player: string, deadline: number) => void;
  }) {
    console.log("Listening to contract events...");

    this.contract.on("PlayerJoined", (gameId: number | bigint, player: string) => {
      console.log(`Event: PlayerJoined game=${gameId} player=${player}`);

      const gId = Number(gameId);
      const pAddr = player.toLowerCase();

      if (!this.paidPlayers.has(gId)) {
        this.paidPlayers.set(gId, new Set());
      }
      this.paidPlayers.get(gId)!.add(pAddr);

      callbacks.onPlayerJoined(gId, player);
    });

    this.contract.on("GameStarted", (gameId: number | bigint) => {
      console.log(`Event: GameStarted game=${gameId}`);
      callbacks.onGameStarted(Number(gameId));
    });

    this.contract.on(
      "TurnChanged",
      (gameId: number | bigint, player: string, deadline: number | bigint) => {
        console.log(`Event: TurnChanged game=${gameId} player=${player}`);
        callbacks.onTurnChanged(Number(gameId), player, Number(deadline));
      },
    );
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
      () => this.contract.reportCollapse(gameId),
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
      () => this.contract.startGame(gameId),
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
      () => this.contract.completeTurn(gameId),
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
      () => this.contract.timeoutTurn(gameId),
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
      () => this.contract.eliminatePlayer(gameId, playerAddress, reason),
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
