import React, { useState } from 'react'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useAccount } from 'wagmi'

interface LeaderboardModalProps {
    onClose: () => void
}

export default function LeaderboardModal({ onClose }: LeaderboardModalProps) {
    const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM')
    const { topScores, highScore, rank, totalPlayers, refetchAll } = useLeaderboard(difficulty)
    const { address } = useAccount()

    // Refresh data when difficulty changes
    React.useEffect(() => {
        refetchAll()
    }, [difficulty, refetchAll])

    const formatAddress = (addr: string) => {
        if (address && addr.toLowerCase() === address.toLowerCase()) return 'You'
        return addr.slice(0, 6) + '...' + addr.slice(-4)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 p-6 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">🏆</span>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Leaderboard</h2>
                            <p className="text-gray-400 text-sm">Top players by difficulty</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Difficulty Tabs */}
                <div className="flex bg-black/40 p-1 rounded-xl mb-6">
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

                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 text-center">
                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Your Best</div>
                        <div className="text-2xl font-mono font-bold text-yellow-400">{highScore}</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 text-center">
                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Your Rank</div>
                        <div className="text-2xl font-mono font-bold text-blue-400">#{rank > 0 ? rank : '-'}</div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5 text-center">
                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Players</div>
                        <div className="text-2xl font-mono font-bold text-purple-400">{totalPlayers}</div>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto min-h-[300px] bg-black/20 rounded-xl border border-white/5">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-gray-900/95 backdrop-blur-sm text-xs text-gray-400 uppercase tracking-wider font-bold">
                            <tr>
                                <th className="p-4 border-b border-white/10">Rank</th>
                                <th className="p-4 border-b border-white/10">Player</th>
                                <th className="p-4 border-b border-white/10 text-right">Score</th>
                                <th className="p-4 border-b border-white/10 text-right">Date</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {topScores.length > 0 ? (
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
                                            {entry.score}
                                        </td>
                                        <td className="p-4 text-right text-gray-500 text-xs">
                                            {new Date(entry.timestamp * 1000).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500 italic">
                                        No scores yet for this difficulty. Be the first!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
