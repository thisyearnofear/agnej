import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { LeaderboardABI } from '../abi/LeaderboardABI'
import { useEffect } from 'react'

const LEADERBOARD_ADDRESS = '0x3127Ebc72F9760728cc2032DC28Ed7D2250bC9cF'

export interface ScoreEntry {
    player: string
    score: bigint
    timestamp: bigint
    isVerified?: boolean
}

export function useLeaderboard(difficulty: 'EASY' | 'MEDIUM' | 'HARD', verifiedOnly: boolean = false) {
    const { address } = useAccount()
    const { writeContract, data: hash, isPending, error } = useWriteContract()

    const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({ hash })

    // ============ Read Verification Status ============
    const { data: isVerifiedData } = useReadContract({
        address: LEADERBOARD_ADDRESS,
        abi: LeaderboardABI,
        functionName: 'isVerified',
        args: address ? [address] : undefined,
        query: { enabled: !!address }
    })

    // ============ Read Personal High Score ============
    const { data: highScoreData, refetch: refetchHighScore } = useReadContract({
        address: LEADERBOARD_ADDRESS,
        abi: LeaderboardABI,
        functionName: 'getHighScore',
        args: address ? [address, difficulty] : undefined,
        query: { enabled: !!address }
    })

    // ============ Read Player Rank ============
    const { data: rankData, refetch: refetchRank } = useReadContract({
        address: LEADERBOARD_ADDRESS,
        abi: LeaderboardABI,
        functionName: 'getPlayerRank',
        args: address ? [address, difficulty, verifiedOnly] : undefined,
        query: { enabled: !!address }
    })

    // ============ Read Total Players ============
    const { data: totalPlayersData, refetch: refetchTotalPlayers } = useReadContract({
        address: LEADERBOARD_ADDRESS,
        abi: LeaderboardABI,
        functionName: 'getTotalPlayers',
        args: [difficulty, verifiedOnly]
    })

    // ============ Read Top Scores ============
    const { data: topScoresData, refetch: refetchTopScores } = useReadContract({
        address: LEADERBOARD_ADDRESS,
        abi: LeaderboardABI,
        functionName: 'getTopScores',
        args: [difficulty, BigInt(10), verifiedOnly]
    })

    // ============ Auto-refetch on Confirmation ============
    useEffect(() => {
        if (isConfirmed) {
            refetchHighScore()
            refetchRank()
            refetchTotalPlayers()
            refetchTopScores()
        }
    }, [isConfirmed, refetchHighScore, refetchRank, refetchTotalPlayers, refetchTopScores])

    // ============ Actions ============
    const submitScore = async (submitDifficulty: 'EASY' | 'MEDIUM' | 'HARD', score: number) => {
        if (!address) return
        writeContract({
            address: LEADERBOARD_ADDRESS,
            abi: LeaderboardABI,
            functionName: 'submitScore',
            args: [submitDifficulty, BigInt(score)]
        })
    }

    const verifyHuman = async () => {
        if (!address) return
        writeContract({
            address: LEADERBOARD_ADDRESS,
            abi: LeaderboardABI,
            functionName: 'verifyHuman'
        })
    }

    const refetchAll = () => {
        refetchHighScore()
        refetchRank()
        refetchTotalPlayers()
        refetchTopScores()
    }

    return {
        submitScore,
        verifyHuman,
        refetchAll,
        highScore: highScoreData ? Number(highScoreData) : 0,
        rank: rankData ? Number(rankData) : 0,
        totalPlayers: totalPlayersData ? Number(totalPlayersData) : 0,
        topScores: topScoresData ? (topScoresData as ScoreEntry[]).map(entry => ({
            player: entry.player,
            score: Number(entry.score),
            timestamp: Number(entry.timestamp),
            isVerified: entry.isVerified
        })) : [],
        isVerified: !!isVerifiedData,
        isPending,
        isConfirming,
        isConfirmed,
        hash,
        error,
        contractAddress: LEADERBOARD_ADDRESS
    }
}
