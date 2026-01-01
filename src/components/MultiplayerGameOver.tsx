'use client'

import React from 'react'

interface Survivor {
    address: string
    isWinner: boolean
}

interface GameOverProps {
    survivors: Survivor[]
    status: 'COLLAPSED' | 'ENDED'
    activePlayers: string[]
    userAddress?: string
    potSize: number
    onExit?: () => void
    // Solo competitor mode fields
    mode?: 'MULTIPLAYER' | 'SOLO_COMPETITOR' | 'SOLO_PRACTICE'
    score?: number
    highScore?: number
    rank?: number
    totalPlayers?: number
    topScores?: Array<{ player: string, score: number }>
    onPlayAgain?: () => void
    isPending?: boolean
    isConfirming?: boolean
    isConfirmed?: boolean
    onSubmitScore?: () => void
    
    // ENHANCEMENT: Add metrics display to existing component
    metrics?: {
        moveSuccessRate?: number
        totalMoves?: number
        successfulMoves?: number
        failedMoves?: number
        avgTurnDuration?: number
        reconnectSuccessRate?: number
        disconnectEvents?: number
        gameDuration?: number
    }
}

export default function GameOver({
    survivors,
    status,
    activePlayers,
    userAddress,
    potSize,
    onExit,
    mode = 'MULTIPLAYER',
    score = 0,
    highScore = 0,
    rank = 0,
    totalPlayers = 0,
    topScores = [],
    onPlayAgain,
    isPending = false,
    isConfirming = false,
    isConfirmed = false,
    onSubmitScore,
    metrics
}: GameOverProps) {
    const userAddress_lower = userAddress?.toLowerCase()
    const userWon = survivors.some(s => s.address.toLowerCase() === userAddress_lower && s.isWinner)
    const userSurvived = survivors.some(s => s.address.toLowerCase() === userAddress_lower)

    const formatAddress = (addr: string) => {
        return addr.slice(0, 6) + '...' + addr.slice(-4)
    }

    // Solo mode: Only user as survivor
    const displaySurvivors = mode === 'SOLO_COMPETITOR' ? 
        [{ address: userAddress || 'You', isWinner: true }] : 
        survivors

    const isSoloMode = mode === 'SOLO_COMPETITOR'
    const isNewHighScore = score > highScore && score > 0

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
            <div className={`bg-gradient-to-br ${isSoloMode && isNewHighScore ? 'from-yellow-900 to-amber-900' : userWon ? 'from-yellow-900 to-amber-900' : 'from-gray-900 to-gray-800'} border ${isSoloMode && isNewHighScore ? 'border-yellow-400/50' : userWon ? 'border-yellow-400/50' : 'border-white/20'} p-8 rounded-2xl text-center max-w-lg w-full shadow-2xl`}>
                
                {/* Result Banner */}
                {isSoloMode && isNewHighScore && (
                    <div className="mb-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-400 rounded-lg p-4 animate-pulse">
                        <div className="text-3xl font-black text-yellow-400 mb-1">🔥 NEW HIGH SCORE! 🔥</div>
                        <div className="text-yellow-200 text-sm">Previous: {highScore}</div>
                    </div>
                )}

                {/* Title */}
                {isSoloMode ? (
                    <div>
                        <h2 className="text-4xl font-black mb-2 text-white">Game Over</h2>
                        <p className="text-gray-400 mb-6">Tower collapsed or time ran out</p>
                    </div>
                ) : status === 'COLLAPSED' ? (
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

                {/* Multiplayer Result Banners */}
                {!isSoloMode && (
                    <>
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
                    </>
                )}

                {/* Solo Competitor Stats */}
                {isSoloMode && (
                    <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="text-center">
                                <div className="text-xs text-gray-400 mb-1">Score</div>
                                <div className="text-4xl font-bold text-yellow-400">{score}</div>
                            </div>
                            <div className="text-center border-l border-r border-white/10">
                                <div className="text-xs text-gray-400 mb-1">Rank</div>
                                <div className="text-2xl font-bold text-blue-400">#{rank > 0 ? rank : '—'}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-gray-400 mb-1">Players</div>
                                <div className="text-lg font-semibold text-purple-400">{totalPlayers}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Leaderboard - Top 3 for solo, full list for multiplayer */}
                {isSoloMode && topScores && topScores.length > 0 && (
                    <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
                        <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">Top Scores</div>
                        <div className="space-y-2">
                            {topScores.slice(0, 3).map((entry, idx) => (
                                <div key={idx} className={`flex items-center justify-between p-2 rounded-lg text-sm ${idx === 0 ? 'bg-yellow-500/20 border border-yellow-500/50' : 'bg-white/5'}`}>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                                        <span className="text-gray-300 font-mono text-xs">
                                            {entry.player.slice(0, 4)}...{entry.player.slice(-3)}
                                        </span>
                                    </div>
                                    <span className="text-yellow-400 font-bold">{entry.score}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pot Info (Multiplayer) */}
                {!isSoloMode && (
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
                )}

                {/* Metrics Display (ENHANCEMENT: Add to existing component) */}
                {metrics && (
                    <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10">
                        <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-3">
                            📊 Game Statistics
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            {metrics.moveSuccessRate !== undefined && (
                                <div className="bg-blue-500/10 p-2 rounded-lg">
                                    <div className="text-xs text-blue-300 mb-1">Move Success</div>
                                    <div className="text-lg font-bold text-blue-400">
                                        {metrics.moveSuccessRate}%
                                    </div>
                                </div>
                            )}
                            {metrics.totalMoves !== undefined && (
                                <div className="bg-green-500/10 p-2 rounded-lg">
                                    <div className="text-xs text-green-300 mb-1">Total Moves</div>
                                    <div className="text-lg font-bold text-green-400">
                                        {metrics.totalMoves}
                                    </div>
                                </div>
                            )}
                            {metrics.avgTurnDuration !== undefined && (
                                <div className="bg-purple-500/10 p-2 rounded-lg">
                                    <div className="text-xs text-purple-300 mb-1">Avg Turn Time</div>
                                    <div className="text-lg font-bold text-purple-400">
                                        {metrics.avgTurnDuration}s
                                    </div>
                                </div>
                            )}
                            {metrics.gameDuration !== undefined && (
                                <div className="bg-orange-500/10 p-2 rounded-lg">
                                    <div className="text-xs text-orange-300 mb-1">Game Duration</div>
                                    <div className="text-lg font-bold text-orange-400">
                                        {Math.round(metrics.gameDuration / 1000)}s
                                    </div>
                                </div>
                            )}
                            {metrics.reconnectSuccessRate !== undefined && (
                                <div className="bg-yellow-500/10 p-2 rounded-lg">
                                    <div className="text-xs text-yellow-300 mb-1">Reconnect Rate</div>
                                    <div className="text-lg font-bold text-yellow-400">
                                        {metrics.reconnectSuccessRate}%
                                    </div>
                                </div>
                            )}
                            {metrics.disconnectEvents !== undefined && (
                                <div className="bg-red-500/10 p-2 rounded-lg">
                                    <div className="text-xs text-red-300 mb-1">Disconnections</div>
                                    <div className="text-lg font-bold text-red-400">
                                        {metrics.disconnectEvents}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Survivors List */}
                <div className="bg-white/5 rounded-lg p-4 mb-6 border border-white/10 text-left">
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-3">{isSoloMode ? 'Result' : 'Survivors'}</div>
                    <div className="space-y-2">
                        {displaySurvivors.map((survivor, idx) => (
                            <div
                                key={survivor.address}
                                className={`flex items-center justify-between p-2 rounded-lg text-sm ${survivor.isWinner
                                    ? 'bg-yellow-500/20 border border-yellow-500/50'
                                    : 'bg-white/5'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">
                                        {survivor.isWinner ? '🥇' : !isSoloMode && (survivor === displaySurvivors[1] ? '🥈' : survivor === displaySurvivors[2] ? '🥉' : '•')}
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
                    {isSoloMode && onSubmitScore && (
                        <button
                            onClick={onSubmitScore}
                            disabled={isPending || isConfirming || isConfirmed}
                            className={`w-full font-bold py-3 rounded-lg transition-all transform text-sm ${isConfirmed
                                ? 'bg-green-600 text-white cursor-default'
                                : 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white hover:scale-105'
                                } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
                        >
                            {isPending ? '⏳ Check Wallet...' :
                                isConfirming ? '⛓️ Confirming...' :
                                    isConfirmed ? '✅ Submitted!' : '💎 Submit Score'}
                        </button>
                    )}

                    {onPlayAgain && isSoloMode && (
                        <button
                            onClick={onPlayAgain}
                            className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
                        >
                            🔄 Again
                        </button>
                    )}

                    {onExit && !isSoloMode && (
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
                            className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-semibold py-2 rounded-lg transition-colors text-sm"
                        >
                            🚪 {isSoloMode ? 'Menu' : 'Back to Menu'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
