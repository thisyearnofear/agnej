import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { LeaderboardABI } from '../abi/LeaderboardABI'
import { useEffect } from 'react'

// Contract Address - Newly deployed on Linea Sepolia
const LEADERBOARD_ADDRESS = '0x3127Ebc72F9760728cc2032DC28Ed7D2250bC9cF'

export interface ScoreEntry {
    player: string
    score: bigint
    timestamp: bigint
}

export function useLeaderboard(difficulty: 'EASY' | 'MEDIUM' | 'HARD') {
    const { address } = useAccount()
    const { writeContract, data: hash, isPending, error } = useWriteContract()

    const { isLoading: isConfirming, isSuccess: isConfirmed } =
        useWaitForTransactionReceipt({ hash })

    // ============ Read Personal High Score ============
    const {
        data: highScoreData,
        refetch: refetchHighScore
    } = useReadContract({
        address: LEADERBOARD_ADDRESS,
        abi: LeaderboardABI,
        functionName: 'getHighScore',
        args: address ? [address, difficulty] : undefined, // ✅ Fixed: Use dynamic difficulty
        query: {
            enabled: !!address,
        }
    })

    // ============ Read Player Rank ============
    const {
        data: rankData,
        refetch: refetchRank
    } = useReadContract({
        address: LEADERBOARD_ADDRESS,
        abi: LeaderboardABI,
        functionName: 'getPlayerRank',
        args: address ? [address, difficulty] : undefined,
        query: {
            enabled: !!address,
        }
    })

    // ============ Read Total Players ============
    const {
        data: totalPlayersData,
        refetch: refetchTotalPlayers
    } = useReadContract({
        address: LEADERBOARD_ADDRESS,
        abi: LeaderboardABI,
        functionName: 'getTotalPlayers',
        args: [difficulty],
    })

    // ============ Read Top Scores ============
    const {
        data: topScoresData,
        refetch: refetchTopScores
    } = useReadContract({
        address: LEADERBOARD_ADDRESS,
        abi: LeaderboardABI,
        functionName: 'getTopScores',
        args: [difficulty, BigInt(10)], // Top 10
    })

    // ============ Auto-refetch on Confirmation ============
    useEffect(() => {
        if (isConfirmed) {
            // Refetch all data after successful submission
            refetchHighScore()
            refetchRank()
            refetchTotalPlayers()
            refetchTopScores()
        }
    }, [isConfirmed, refetchHighScore, refetchRank, refetchTotalPlayers, refetchTopScores])

    // ============ Actions ============
    const submitScore = async (submitDifficulty: 'EASY' | 'MEDIUM' | 'HARD', score: number) => {
        if (!address) {
            console.error('Wallet not connected')
            return
        }

        console.log(`Submitting score: ${score} for difficulty: ${submitDifficulty} to ${LEADERBOARD_ADDRESS}`)

        writeContract({
            address: LEADERBOARD_ADDRESS,
            abi: LeaderboardABI,
            functionName: 'submitScore',
            args: [submitDifficulty, BigInt(score)],
        })
    }

    const refetchAll = () => {
        refetchHighScore()
        refetchRank()
        refetchTotalPlayers()
        refetchTopScores()
    }

    // ============ Parse and Return Data ============
    return {
        // Actions
        submitScore,
        refetchAll,

        // Personal Stats
        highScore: highScoreData ? Number(highScoreData) : 0,
        rank: rankData ? Number(rankData) : 0,

        // Global Stats
        totalPlayers: totalPlayersData ? Number(totalPlayersData) : 0,
        topScores: topScoresData ? (topScoresData as ScoreEntry[]).map(entry => ({
            player: entry.player,
            score: Number(entry.score),
            timestamp: Number(entry.timestamp)
        })) : [],

        // Transaction States
        isPending,
        isConfirming,
        isConfirmed,
        hash,
        error,

        // Contract Info
        contractAddress: LEADERBOARD_ADDRESS,
    }
}
