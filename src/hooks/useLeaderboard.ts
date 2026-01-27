import { useReadContract, useWriteContract, useAccount, useWaitForTransactionReceipt } from 'wagmi'
import { LeaderboardABI } from '../abi/LeaderboardABI'
import { useEffect } from 'react'
import { CONTRACTS } from '@/config'

const { LEADERBOARD } = CONTRACTS;

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
    const { data: highScoreData, refetch: refetchHighScore } = useReadContract({
        address: LEADERBOARD.address,
        abi: LeaderboardABI,
        functionName: 'getHighScore',
        args: address ? [address, difficulty] : undefined,
        query: { enabled: !!address }
    })

    // ============ Read Player Rank ============
    const { data: rankData, refetch: refetchRank } = useReadContract({
        address: LEADERBOARD.address,
        abi: LeaderboardABI,
        functionName: 'getPlayerRank',
        args: address ? [address, difficulty] : undefined,
        query: { enabled: !!address }
    })

    // ============ Read Total Players ============
    const { data: totalPlayersData, refetch: refetchTotalPlayers } = useReadContract({
        address: LEADERBOARD.address,
        abi: LeaderboardABI,
        functionName: 'getTotalPlayers',
        args: [difficulty]
    })

    // ============ Read Top Scores ============
    const { data: topScoresData, refetch: refetchTopScores } = useReadContract({
        address: LEADERBOARD.address,
        abi: LeaderboardABI,
        functionName: 'getTopScores',
        args: [difficulty, BigInt(10)]
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
            address: LEADERBOARD.address,
            abi: LeaderboardABI,
            functionName: 'submitScore',
            args: [submitDifficulty, BigInt(score)]
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
        refetchAll,
        highScore: highScoreData ? Number(highScoreData) : 0,
        rank: rankData ? Number(rankData) : 0,
        totalPlayers: totalPlayersData ? Number(totalPlayersData) : 0,
        topScores: topScoresData ? (topScoresData as ScoreEntry[]).map(entry => ({
            player: entry.player,
            score: Number(entry.score),
            timestamp: Number(entry.timestamp)
        })) : [],
        isPending,
        isConfirming,
        isConfirmed,
        hash,
        error,
        contractAddress: LEADERBOARD.address
    }
}
