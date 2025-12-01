'use client'

import React from 'react'

interface Survivor {
    address: string
    isWinner: boolean
}

interface MultiplayerGameOverProps {
    survivors: Survivor[]
    status: 'COLLAPSED' | 'ENDED'
    activePlayers: string[]
    userAddress?: string
    potSize: number
    onExit?: () => void
}

export default function MultiplayerGameOver({
    survivors,
    status,
    activePlayers,
    userAddress,
    potSize,
    onExit
}: MultiplayerGameOverProps) {
    const userAddress_lower = userAddress?.toLowerCase()
    const userWon = survivors.some(s => s.address.toLowerCase() === userAddress_lower && s.isWinner)
    const userSurvived = survivors.some(s => s.address.toLowerCase() === userAddress_lower)

    const formatAddress = (addr: string) => {
        return addr.slice(0, 6) + '...' + addr.slice(-4)
    }

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className={`bg-gradient-to-br ${userWon ? 'from-yellow-900 to-amber-900' : 'from-gray-900 to-gray-800'} border ${userWon ? 'border-yellow-400/50' : 'border-white/20'} p-8 rounded-2xl text-center max-w-lg w-full shadow-2xl`}>
                
                {/* Title */}
                {status === 'COLLAPSED' ? (
                    <div>
                        <h2 className="text-4xl font-black mb-2 text-white">🏚️ TOWER COLLAPSED!</h2>
                        <p className="text-gray-400 mb-6">{survivors.length} survivor{survivors.length !== 1 ? 's' : ''}</p>
                    </div>
                ) : (
                    <div>
                        <h2 className="text-4xl font-black mb-2 text-white">🏁 GAME OVER</h2>
                        <p className="text-gray-400 mb-6">{activePlayers.length} player{activePlayers.length !== 1 ? 's' : ''} eliminated</p>
                    </div>
                )}

                {/* Result Banner */}
                {userWon && (
                    <div className="mb-6 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-2 border-yellow-400 rounded-lg p-4 animate-pulse">
                        <div className="text-3xl font-black text-yellow-400 mb-1">🎉 YOU WON! 🎉</div>
                        <div className="text-yellow-200 text-sm">Last survivor standing</div>
                    </div>
                )}

                {userSurvived && !userWon && (
                    <div className="mb-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-2 border-green-400 rounded-lg p-4">
                        <div className="text-xl font-bold text-green-400 mb-1">✓ You Survived</div>
                        <div className="text-green-200 text-sm">Waiting for final result...</div>
                    </div>
                )}

                {!userSurvived && (
                    <div className="mb-6 bg-gradient-to-r from-red-500/20 to-pink-500/20 border-2 border-red-400 rounded-lg p-4">
                        <div className="text-xl font-bold text-red-400 mb-1">✗ Eliminated</div>
                        <div className="text-red-200 text-sm">Better luck next time!</div>
                    </div>
                )}

                {/* Pot Info */}
                <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Prize Pool</div>
                    <div className="text-2xl font-bold text-green-400">
                        {potSize > 0 ? `$${potSize.toFixed(2)} USDC` : 'Calculating...'}
                    </div>
                    {userWon && (
                        <div className="text-sm text-yellow-300 mt-2">
                            Claimed to your wallet 🏆
                        </div>
                    )}
                </div>

                {/* Survivors List */}
                <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10 text-left">
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-3">Survivors</div>
                    <div className="space-y-2">
                        {survivors.map((survivor, idx) => (
                            <div
                                key={survivor.address}
                                className={`flex items-center justify-between p-2 rounded-lg text-sm ${survivor.isWinner
                                    ? 'bg-yellow-500/20 border border-yellow-500/50'
                                    : 'bg-white/5'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">
                                        {survivor.isWinner ? '🥇' : survivor === survivors[1] ? '🥈' : survivor === survivors[2] ? '🥉' : '•'}
                                    </span>
                                    <span className="font-mono text-white">
                                        {formatAddress(survivor.address)}
                                        {survivor.address.toLowerCase() === userAddress_lower && ' (You)'}
                                    </span>
                                </div>
                                {survivor.isWinner && <span className="text-yellow-400 font-bold text-xs">WINNER</span>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 flex-col">
                    {onExit && (
                        <button
                            onClick={onExit}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105"
                        >
                            🎮 Play Again
                        </button>
                    )}
                    {onExit && (
                        <button
                            onClick={onExit}
                            className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
                        >
                            🚪 Back to Menu
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
