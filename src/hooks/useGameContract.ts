import {
  useReadContract,
  useWriteContract,
  useAccount,
  useWaitForTransactionReceipt,
} from "wagmi";
import { HouseOfCardsABI } from "../abi/HouseOfCardsABI";
import { parseUnits } from "viem";
import { CONTRACTS, ZERO_ADDRESS } from "@/config";
import { lineaSepolia } from 'wagmi/chains'

const { HOUSE_OF_CARDS } = CONTRACTS;

export function useGameContract() {
  const { address, chainId } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const currentChainId = chainId || lineaSepolia.id;
  const contractAddress = HOUSE_OF_CARDS.getAddress(currentChainId) as `0x${string}`;

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  // Read Game ID
  const { data: gameId } = useReadContract({
    address: contractAddress,
    abi: HouseOfCardsABI,
    functionName: "currentGameId",
  });

  // Read Game State
  const { data: gameStateData, refetch: refetchGameState } = useReadContract({
    address: contractAddress,
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
    writeContract({
      address: contractAddress,
      abi: HouseOfCardsABI,
      functionName: "joinGame",
      args: [referrer as `0x${string}`],
      value: parseUnits("0.001", 18), 
    });
  };

  const reload = async () => {
    writeContract({
      address: contractAddress,
      abi: HouseOfCardsABI,
      functionName: "reload",
      value: parseUnits("0.001", 18),
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
