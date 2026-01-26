'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Image from 'next/image'
import Game from '@/components/Game'
import GameSettings, { GameSettingsConfig } from '@/components/GameSettings'

export default function PlayPage() {
  const [gameSettings, setGameSettings] = useState<GameSettingsConfig | null>(null)
  const [gameKey, setGameKey] = useState(0) // Force re-render for reset

  const handleStartGame = (settings: GameSettingsConfig) => {
    setGameSettings(settings)
    setGameKey(0) // Reset game key
  }

  const handleResetGame = () => {
    setGameKey(prev => prev + 1) // Force re-render to reset the game
  }

  return (
    <div 
      className="h-full w-full bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white flex flex-col overflow-hidden"
      style={{
        height: '100svh', // Use small viewport height for mobile
        minHeight: '100svh'
      }}
    >
      <header className="flex justify-between items-center p-4 md:p-6 border-b border-white/10 flex-shrink-0">
        <Link href="/" className="flex items-center space-x-2 hover:text-blue-400 transition-colors">
          <Image
            src="/images/agnej.png"
            alt="Agnej Logo"
            width={32}
            height={32}
          />
          <span className="text-xl font-bold ml-1">Agnej</span>
        </Link>
        <ConnectButton />
      </header>

      <main className="flex-1 relative overflow-hidden">
        {/* Show settings first, then game */}
        {!gameSettings ? (
          <div className="h-full flex items-center justify-center p-2 md:p-6">
            <GameSettings onStart={handleStartGame} />
          </div>
        ) : (
          <Game
            key={gameKey}
            settings={gameSettings}
            onReset={handleResetGame}
            onExit={() => setGameSettings(null)}
          />
        )}
      </main>
    </div>
  )
}
