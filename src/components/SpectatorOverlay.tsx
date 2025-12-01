'use client'

import React, { useEffect, useState } from 'react'

interface Player {
    address: string
    isCurrentTurn: boolean
}

interface SpectatorOverlayProps {
    currentPlayer: string | null
    players: Player[]
    timeLeft?: number
    isCollapsed?: boolean
}

export default function SpectatorOverlay({
    currentPlayer,
    players,
    timeLeft,
    isCollapsed
}: SpectatorOverlayProps) {
    const [pulseIntensity, setPulseIntensity] = useState(0)

    // Animate pulsing effect as time counts down
    useEffect(() => {
        if (!timeLeft || timeLeft <= 0) return
        setPulseIntensity(Math.max(0, 1 - (timeLeft / 30)))
    }, [timeLeft])

    const formatAddress = (addr: string) => {
        return addr.slice(0, 6) + '...' + addr.slice(-4)
    }

    const currentPlayerObj = players.find(p => p.address === currentPlayer)

    return (
        <div className="fixed inset-0 pointer-events-none z-40 flex flex-col items-center justify-center">
            {/* Spectator Badge */}
            <div className="absolute top-20 right-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full shadow-lg backdrop-blur-md border border-purple-400/50 font-bold">
                👁️ SPECTATING
            </div>

            {/* Center: Current Player Display */}
            {!isCollapsed && currentPlayerObj && (
                <div className="text-center">
                    <div className="text-sm text-gray-300 mb-2 opacity-75">CURRENT TURN</div>
                    <div className="text-4xl font-mono font-black text-white drop-shadow-lg mb-4">
                        {formatAddress(currentPlayerObj.address)}
                    </div>
                    
                    {timeLeft && (
                        <div className="flex flex-col items-center gap-3">
                            <div className={`text-6xl font-black drop-shadow-lg transition-colors duration-300 ${
                                timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-white'
                            }`}>
                                {timeLeft}s
                            </div>
                            <div className={`w-80 h-3 bg-black/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/20`} style={{
                                boxShadow: `0 0 20px rgba(${timeLeft <= 10 ? '239, 68, 68' : '255, 255, 255'}, ${pulseIntensity * 0.5})`
                            }}>
                                <div
                                    className={`h-full transition-all duration-1000 ease-linear ${
                                        timeLeft <= 10 ? 'bg-red-500' : 'bg-blue-400'
                                    }`}
                                    style={{ width: `${(timeLeft / 30) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tower Collapsed Message */}
            {isCollapsed && (
                <div className="text-center">
                    <div className="text-6xl font-black text-red-500 drop-shadow-lg mb-4 animate-bounce">
                        🏚️
                    </div>
                    <div className="text-3xl font-black text-white drop-shadow-lg">
                        TOWER COLLAPSED!
                    </div>
                </div>
            )}

            {/* Bottom: Mini Player List */}
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md border border-white/20 rounded-xl p-4 max-w-sm w-80">
                <div className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-3">Remaining Players</div>
                <div className="space-y-2">
                    {players.map(player => (
                        <div
                            key={player.address}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs transition-all ${
                                player.isCurrentTurn
                                    ? 'bg-blue-500/30 border border-blue-500/50 font-bold'
                                    : 'bg-white/5'
                            }`}
                        >
                            <span className="font-mono text-white">
                                {formatAddress(player.address)}
                            </span>
                            {player.isCurrentTurn && <span className="text-blue-300">🎯 ACTIVE</span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
