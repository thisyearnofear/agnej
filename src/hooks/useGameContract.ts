import {
  useReadContract,
  useWriteContract,
  useAccount,
  useWaitForTransactionReceipt,
} from "wagmi";
import { HouseOfCardsABI } from "../abi/HouseOfCardsABI";
import { parseUnits } from "viem";
import { CONTRACTS, ZERO_ADDRESS } from "@/config";

const { HOUSE_OF_CARDS } = CONTRACTS;

export function useGameContract() {
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  // Read Game ID
  const { data: gameId } = useReadContract({
    address: HOUSE_OF_CARDS.address,
    abi: HouseOfCardsABI,
    functionName: "currentGameId",
  });

  // Read Game State
  const { data: gameStateData, refetch: refetchGameState } = useReadContract({
    address: HOUSE_OF_CARDS.address,
    abi: HouseOfCardsABI,
    functionName: "games",
    args: gameId ? [gameId] : undefined,
    query: {
      enabled: !!gameId,
      refetchInterval: 2000, // Poll every 2s
    },
  });

  // Actions
  const joinGame = async (referrer: string = ZERO_ADDRESS) => {
    // Note: In a real app, you'd need to Approve USDC first
    writeContract({
      address: HOUSE_OF_CARDS.address,
      abi: HouseOfCardsABI,
      functionName: "joinGame",
      args: [referrer as `0x${string}`],
      value: parseUnits("0.001", 18), // 0.001 ETH
    });
  };

  const reload = async () => {
    writeContract({
      address: HOUSE_OF_CARDS.address,
      abi: HouseOfCardsABI,
      functionName: "reload",
      value: parseUnits("0.001", 18), // 0.001 ETH
    });
  };

  return {
    gameId,
    gameStateData,
    joinGame,
    reload,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error,
  };
}
