import React, { useState } from 'react'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useAccount } from 'wagmi'
import PoHVerification from './PoHVerification'
import EnhancedModal from './ui/EnhancedModal'
import { ButtonWithFeedback, LoadingSpinner, AnimatedCounter } from './ui/MicroInteractions'

interface LeaderboardModalProps {
    onClose: () => void
}

export default function LeaderboardModal({ onClose }: LeaderboardModalProps) {
    const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM')
    const [verifiedOnly, setVerifiedOnly] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const { topScores, highScore, rank, totalPlayers, refetchAll } = useLeaderboard(difficulty, verifiedOnly)
    const { address } = useAccount()

    React.useEffect(() => {
        const loadData = async () => {
            setIsLoading(true)
            await refetchAll()
            setIsLoading(false)
        }
        loadData()
    }, [difficulty, verifiedOnly, refetchAll])

    const formatAddress = (addr: string) => {
        if (address && addr.toLowerCase() === address.toLowerCase()) return 'You'
        return addr.slice(0, 6) + '...' + addr.slice(-4)
    }



    return (
        <EnhancedModal
            isOpen={true}
            onClose={onClose}
            title="Leaderboard"
            subtitle="Top players by difficulty"
            size="xl"
            closeButtonType="svg"
        >
            {/* Difficulty Tabs */}
            <div className="flex bg-black/40 p-1 rounded-xl mb-4">
                {(['EASY', 'MEDIUM', 'HARD'] as const).map((d) => (
                    <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                            difficulty === d 
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {d}
                    </button>
                ))}
            </div>

            {/* PoH Verification Component */}
            <div className="mb-4">
                <PoHVerification onVerified={refetchAll} compact={false} showFullFlow={true} />
            </div>

            {/* Verified Filter Toggle */}
            <div className="flex items-center justify-between bg-black/20 p-3 rounded-xl mb-4 border border-white/5">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-300">Show Verified Only</span>
                    <span className="text-xs text-gray-500">(PoH)</span>
                </div>
                <button
                    onClick={() => setVerifiedOnly(!verifiedOnly)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${verifiedOnly ? 'bg-green-600' : 'bg-gray-700'}`}
                >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${verifiedOnly ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
            </div>

            {/* Stats Summary with Animated Counters */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-4 border border-white/5 text-center">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Your Best</div>
                    <div className="text-2xl font-mono font-bold text-yellow-400">
                        {isLoading ? <LoadingSpinner size={20} /> : <AnimatedCounter value={highScore} />}
                    </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5 text-center">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Your Rank</div>
                    <div className="text-2xl font-mono font-bold text-blue-400">
                        {isLoading ? <LoadingSpinner size={20} /> : (rank > 0 ? `#${rank}` : '-')}
                    </div>
                </div>
                <div className="bg-white/5 rounded-xl p-4 border border-white/5 text-center">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Players</div>
                    <div className="text-2xl font-mono font-bold text-purple-400">
                        {isLoading ? <LoadingSpinner size={20} /> : <AnimatedCounter value={totalPlayers} />}
                    </div>
                </div>
            </div>

            {/* Table with Loading State */}
            <div className="flex-1 overflow-y-auto min-h-[300px] bg-black/20 rounded-xl border border-white/5">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm text-xs text-gray-400 uppercase tracking-wider font-bold">
                        <tr>
                            <th className="p-4 border-b border-white/10">Rank</th>
                            <th className="p-4 border-b border-white/10">Player</th>
                            <th className="p-4 border-b border-white/10 text-right">Score</th>
                            <th className="p-4 border-b border-white/10 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {isLoading ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <LoadingSpinner />
                                        <span className="text-gray-400">Loading leaderboard...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : topScores.length > 0 ? (
                            topScores.map((entry, idx) => (
                                <tr key={idx} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                                    address && entry.player.toLowerCase() === address.toLowerCase() ? 'bg-blue-500/10' : ''
                                }`}>
                                    <td className="p-4 font-mono text-gray-400">
                                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                    </td>
                                    <td className="p-4 font-mono text-white">
                                        {formatAddress(entry.player)}
                                    </td>
                                    <td className="p-4 text-right font-bold text-yellow-400">
                                        <AnimatedCounter value={entry.score} />
                                    </td>
                                    <td className="p-4 text-right">
                                        {entry.isVerified && <span className="text-green-400 text-xs">✓ Verified</span>}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500 italic">
                                    {verifiedOnly ? 'No verified players yet. Be the first!' : 'No scores yet for this difficulty. Be the first!'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Close Button */}
            <div className="mt-4 flex justify-end">
                <ButtonWithFeedback onClick={onClose} type="secondary">
                    Close Leaderboard
                </ButtonWithFeedback>
            </div>
        </EnhancedModal>
    )
}
