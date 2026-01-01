'use client'

import React, { useState } from 'react'
import LeaderboardModal from './LeaderboardModal'
import { useAccount } from 'wagmi'
import { generateInviteLink, copyToClipboard } from '../lib/invite'
import { useGameSocket } from '../hooks/useGameSocket'
import { ButtonWithFeedback, LoadingSpinner } from './ui/MicroInteractions'

export interface GameSettingsConfig {
  gameMode: 'SOLO_PRACTICE' | 'SOLO_COMPETITOR' | 'SINGLE_VS_AI' | 'MULTIPLAYER'
  playerCount: number
  aiOpponentCount?: number
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  stake: number

  showHelpers: boolean
  isHost?: boolean
  joinedGameId?: number
  
  // ENHANCEMENT: Add spectator mode to existing interface
  isSpectator?: boolean
}

interface GameSettingsProps {
  onStart: (settings: GameSettingsConfig) => void
}

type WizardStep = 'mode' | 'config' | 'auth' | 'summary'

export default function GameSettings({ onStart }: GameSettingsProps) {
  // ENHANCEMENT: Add wizard step state to existing component
  const [currentStep, setCurrentStep] = useState<WizardStep>('mode')
  
  // Existing state preserved
  const [gameMode, setGameMode] = useState<'SOLO_PRACTICE' | 'SOLO_COMPETITOR' | 'SINGLE_VS_AI' | 'MULTIPLAYER'>('SOLO_PRACTICE')
  const [playerCount, setPlayerCount] = useState(2)
  const [aiOpponentCount, setAiOpponentCount] = useState(1)
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM')
  const [stake, setStake] = useState(1)
  const [showHelpers, setShowHelpers] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [isHost, setIsHost] = useState(true)
  const [copied, setCopied] = useState(false)
  const [selectedLobbyId, setSelectedLobbyId] = useState<number | undefined>(undefined)
  const [isSigningAuth, setIsSigningAuth] = useState(false)
  
  // ENHANCEMENT: Add spectator mode to existing component
  const [isSpectator, setIsSpectator] = useState(false)
  const { address } = useAccount()
  const { lobbies, fetchLobbies, signAndConnect, authSignature } = useGameSocket()

  // Fetch lobbies when switching to Join mode
  React.useEffect(() => {
    if (gameMode === 'MULTIPLAYER' && !isHost) {
      // Poll for lobbies
      fetchLobbies();
      const interval = setInterval(fetchLobbies, 5000);
      return () => clearInterval(interval);
    }
  }, [gameMode, isHost, fetchLobbies]);

  const handleCopyInvite = async () => {
    if (!address) return
    const inviteLink = generateInviteLink(1, address) // gameId will be dynamic in production
    await copyToClipboard(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ENHANCEMENT: Add wizard navigation helpers
  const handleModeSelect = (mode: typeof gameMode) => {
    setGameMode(mode)
    // Auto-advance for solo practice, stay for others
    if (mode === 'SOLO_PRACTICE') {
      setCurrentStep('summary')
    } else {
      setCurrentStep('config')
    }
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'mode': return 'Choose Game Mode'
      case 'config': return 'Game Configuration'
      case 'auth': return 'Verify Your Wallet'
      case 'summary': return 'Ready to Play'
    }
  }

  const getStepDescription = () => {
    switch (currentStep) {
      case 'mode': return 'How would you like to play?'
      case 'config': return 'Customize your game settings'
      case 'auth': return 'Sign a message to authenticate'
      case 'summary': return 'Review and start your game'
    }
  }

  const canProceed = () => {
    if (currentStep === 'mode') return true
    if (currentStep === 'config') {
      if (gameMode === 'MULTIPLAYER' && !isHost) {
        return selectedLobbyId !== undefined || lobbies.length === 0
      }
      return true
    }
    if (currentStep === 'auth') return authSignature !== null && !isSigningAuth
    return true
  }

  const handleStart = () => {
    const settings: GameSettingsConfig = {
      gameMode,
      playerCount: (gameMode === 'SOLO_PRACTICE' || gameMode === 'SOLO_COMPETITOR') ? 1 : playerCount,
      aiOpponentCount: gameMode === 'SINGLE_VS_AI' ? aiOpponentCount : undefined,
      difficulty,
      stake: (gameMode === 'SOLO_PRACTICE' || gameMode === 'SOLO_COMPETITOR') ? 0 : stake,
      showHelpers,
      isHost: gameMode === 'MULTIPLAYER' ? isHost : true,
      joinedGameId: selectedLobbyId,
      
      // ENHANCEMENT: Add spectator mode to existing settings
      isSpectator: gameMode === 'MULTIPLAYER' && !isHost ? isSpectator : undefined
    }
    onStart(settings)
  }

  const getGameModeDescription = () => {
    switch (gameMode) {
      case 'SOLO_PRACTICE':
        return 'Practice your skills with the physics engine. Reset tower anytime.'
      case 'SOLO_COMPETITOR':
        return 'Race against the clock! Remove blocks to score points. Top 2 levels are locked.'
      case 'SINGLE_VS_AI':
        return 'Play against computer opponents with configurable difficulty.'
      case 'MULTIPLAYER':
        return 'Play with real human players. Connect wallets to participate.'
    }
  }

  const getPlayerDisplay = () => {
    switch (gameMode) {
      case 'SOLO_PRACTICE':
        return '1 Player (Practice)'
      case 'SOLO_COMPETITOR':
        return '1 Player (Competitor)'
      case 'SINGLE_VS_AI':
        return `1 Human vs ${aiOpponentCount} AI`
      case 'MULTIPLAYER':
        return `${playerCount} Human Players`
    }
  }

  // ENHANCEMENT: Step render functions using existing code
  const renderModeStep = () => (
    <div className="space-y-3 md:space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-2 gap-2 md:gap-4">
        {[
          { 
            key: 'SOLO_PRACTICE', 
            title: 'Solo Practice', 
            desc: 'Learn & experiment freely', 
            icon: '🎯', 
            features: ['No time limit', 'No stakes', 'All layers unlocked'],
            disabled: false 
          },
          { 
            key: 'SOLO_COMPETITOR', 
            title: 'Solo Competitor', 
            desc: 'Ranked time-attack challenge', 
            icon: '🏆', 
            features: ['30 second timer', 'Leaderboard ranking', 'Top 2 layers locked'],
            disabled: false 
          },
          { 
            key: 'SINGLE_VS_AI', 
            title: 'Single vs AI', 
            desc: 'Challenge computer opponents', 
            icon: '🤖', 
            features: ['AI difficulty scaling', 'Practice multiplayer', 'Coming soon'],
            disabled: true 
          },
          { 
            key: 'MULTIPLAYER', 
            title: 'Multiplayer', 
            desc: 'Play with real humans', 
            icon: '👥', 
            features: ['2-7 players', 'Real stakes', 'Wallet required'],
            disabled: false 
          }
        ].map((mode) => (
          <ButtonWithFeedback
            key={mode.key}
            onClick={() => !mode.disabled && handleModeSelect(mode.key as any)}
            disabled={mode.disabled}
            type="secondary"
            className={`w-full p-3 md:p-6 rounded-xl md:rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${
              mode.disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-blue-500/50'
            }`}
          >
            <div className="flex items-start gap-2 md:gap-4">
              <span className={`text-2xl md:text-4xl transition-transform duration-300 ${mode.disabled ? 'grayscale' : 'group-hover:scale-110'}`}>
                {mode.icon}
              </span>
              <div className="flex-1">
                <h3 className="text-base md:text-xl font-bold mb-1">{mode.title}</h3>
                <p className="text-gray-400 text-xs md:text-sm mb-2 md:mb-3">{mode.desc}</p>
                <ul className="space-y-0.5 md:space-y-1 hidden md:block">
                  {mode.features.map((feature, idx) => (
                    <li key={idx} className="text-xs text-gray-500 flex items-center gap-2">
                      <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
                {mode.disabled && (
                  <div className="absolute top-4 right-4 bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded-full border border-yellow-500/30">
                    Coming Soon
                  </div>
                )}
              </div>
            </div>
          </ButtonWithFeedback>
        ))}
      </div>
    </div>
  )

  const isProduction = process.env.NODE_ENV === 'production';

  // ENHANCEMENT: Extract existing config section  
  const renderConfigStep = () => (
    <div className="space-y-6">
      {/* AI Opponent Count */}
      {gameMode === 'SINGLE_VS_AI' && (
        <div>
          <label className="block text-white font-semibold mb-2 text-sm">
            AI Opponents: <span className="text-blue-400">{aiOpponentCount}</span>
          </label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map((count) => (
              <button
                key={count}
                onClick={() => setAiOpponentCount(count)}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${aiOpponentCount === count
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Multiplayer Configuration */}
      {gameMode === 'MULTIPLAYER' && (
        <div>
          <label className="block text-white font-semibold mb-2 text-sm">
            Game Action
          </label>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setIsHost(true)}
              className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${isHost
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
            >
              Create Game
            </button>
            <button
              onClick={() => setIsHost(false)}
              className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${!isHost
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
            >
              Join Game
            </button>
          </div>

          {/* Spectator Mode Toggle (ENHANCEMENT: Add to existing UI) */}
          {!isHost && (
            <div className="mb-4 p-3 bg-white/5 rounded-lg border border-white/10">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSpectator}
                  onChange={(e) => setIsSpectator(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-white font-medium text-sm">
                  Join as Spectator 👁️
                </span>
              </label>
              <p className="text-xs text-gray-400 mt-1 ml-7">
                Watch games without playing. No wallet verification required.
              </p>
            </div>
          )}

          {/* Invite Friends Button */}
          {isHost && address && (
            <button
              onClick={handleCopyInvite}
              className="w-full mb-4 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-300 font-semibold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <span>{copied ? '✓ Copied!' : '🔗 Copy Invite Link'}</span>
            </button>
          )}

          {isHost && (
            <>
              <label className="block text-white font-semibold mb-2 text-sm">
                Max Players: <span className="text-blue-400">{playerCount}</span>
              </label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6, 7].map((count) => (
                  <button
                    key={count}
                    onClick={() => setPlayerCount(count)}
                    className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${playerCount === count
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Lobby Browser (Join Mode) */}
          {!isHost && (
            <div className="mt-4">
              <h4 className="text-white font-semibold mb-2 text-sm">Available Lobbies</h4>
              <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {lobbies.length === 0 ? (
                  <div className="text-gray-500 text-sm text-center py-4 bg-white/5 rounded-lg border border-white/5">
                    No active lobbies found.<br />
                    <span className="text-xs">Click "Join Game" to auto-match or wait for one.</span>
                  </div>
                ) : (
                  lobbies.map(lobby => (
                    <button
                      key={lobby.id}
                      onClick={() => setSelectedLobbyId(lobby.id)}
                      className={`w-full flex justify-between items-center p-3 rounded-lg border transition-all ${selectedLobbyId === lobby.id
                          ? 'bg-blue-600/20 border-blue-500 text-white'
                          : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                    >
                      <div className="text-left">
                        <div className="font-bold text-sm">Game #{lobby.id.toString().slice(-4)}</div>
                        <div className="text-xs text-gray-500">{lobby.difficulty} • {lobby.stake} USDC</div>
                      </div>
                      <div className="text-right text-xs">
                        <div>{lobby.activePlayers.length}/{lobby.maxPlayers} Players</div>
                        <div className={lobby.status === 'WAITING' ? 'text-green-400' : 'text-yellow-400'}>
                          {lobby.status}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stake Amount */}
      {gameMode !== 'SOLO_PRACTICE' && gameMode !== 'SOLO_COMPETITOR' && (
        <div>
          <label className="block text-white font-semibold mb-2 text-sm">
            Stake per Player: <span className="text-green-400">{stake} USDC</span>
          </label>
          <div className="flex gap-2">
            {[0.1, 0.5, 1, 5, 10].map((amount) => (
              <button
                key={amount}
                onClick={() => setStake(amount)}
                className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${stake === amount
                  ? 'bg-green-600 text-white shadow-lg shadow-green-900/20'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
              >
                {amount}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Difficulty */}
      {gameMode !== 'SOLO_PRACTICE' && (
        <div>
          <label className="block text-white font-semibold mb-2 text-sm">Difficulty</label>
          <div className="grid grid-cols-3 gap-2">
            {(['EASY', 'MEDIUM', 'HARD'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level)}
                className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all ${difficulty === level
                  ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-900/20'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
              >
                {level}
              </button>
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-2">
            {difficulty === 'EASY' && 'Slower gameplay, tower stability'}
            {difficulty === 'MEDIUM' && 'Balanced challenge'}
            {difficulty === 'HARD' && 'Fast paced, unstable tower'}
          </p>
        </div>
      )}

      {/* Visual Helpers Toggle */}
      <div>
        <label className="flex items-center justify-between cursor-pointer group">
          <div>
            <div className="text-white font-semibold text-sm">Visual Helpers</div>
            <div className="text-gray-500 text-xs">Show selection highlight & drag arrow</div>
          </div>
          <div className={`w-12 h-6 rounded-full p-1 transition-colors ${showHelpers ? 'bg-green-600' : 'bg-gray-700'}`} onClick={() => setShowHelpers(!showHelpers)}>
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${showHelpers ? 'translate-x-6' : 'translate-x-0'}`} />
          </div>
        </label>
      </div>
    </div>
  )

  const renderAuthStep = () => (
    <div className="space-y-6">
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <span className="text-4xl">🔐</span>
          <div>
            <h3 className="text-white font-bold mb-2">Wallet Authentication Required</h3>
            <p className="text-gray-300 text-sm mb-4">
              Sign a message with your wallet to verify your identity on the game server. This is a one-time authentication that will be saved locally.
            </p>
            <p className="text-gray-400 text-xs">
              <strong>What happens:</strong> You'll be asked to sign a message (no gas fees). This proves you control the wallet and prevents spoofing.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {authSignature ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
            <span className="text-2xl">✓</span>
            <div>
              <div className="font-bold text-green-400">Authenticated</div>
              <div className="text-sm text-gray-300">{address?.slice(0, 6)}...{address?.slice(-4)}</div>
            </div>
          </div>
        ) : (
          <ButtonWithFeedback
            onClick={() => {
              setIsSigningAuth(true);
              signAndConnect().finally(() => setIsSigningAuth(false));
            }}
            disabled={isSigningAuth}
            type="primary"
            size="large"
            className="w-full flex items-center justify-center gap-3"
          >
            {isSigningAuth ? (
              <>
                <LoadingSpinner size={20} />
                Signing...
              </>
            ) : (
              <>
                <span>🔑 Sign Message</span>
              </>
            )}
          </ButtonWithFeedback>
        )}
      </div>
    </div>
  )

  const renderSummaryStep = () => {
    const getTotalPot = () => {
      if (gameMode === 'SOLO_PRACTICE' || gameMode === 'SOLO_COMPETITOR') return 0
      if (gameMode === 'SINGLE_VS_AI') return stake * (1 + aiOpponentCount)
      return stake * playerCount
    }

    return (
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <h3 className="text-white font-bold mb-6 text-xl">Game Summary</h3>
        
        <div className="space-y-4">
          {/* Game Mode */}
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
            <span className="text-3xl">
              {gameMode === 'SOLO_PRACTICE' ? '🎯' :
               gameMode === 'SOLO_COMPETITOR' ? '🏆' :
               gameMode === 'SINGLE_VS_AI' ? '🤖' : '👥'}
            </span>
            <div>
              <div className="font-bold text-white">{getPlayerDisplay()}</div>
              <div className="text-sm text-gray-400">
                {gameMode === 'SOLO_PRACTICE' ? 'Free practice mode' :
                 gameMode === 'SOLO_COMPETITOR' ? `Ranked ${difficulty.toLowerCase()} difficulty` :
                 gameMode === 'MULTIPLAYER' && !isHost ? 'Joining existing game' :
                 `${difficulty} difficulty`}
              </div>
            </div>
          </div>

          {/* Pot Size */}
          {getTotalPot() > 0 && (
            <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-xl border border-green-500/20">
              <span className="text-3xl">💰</span>
              <div>
                <div className="font-bold text-green-400">{getTotalPot().toFixed(2)} USDC Total Pot</div>
                <div className="text-sm text-gray-400">Winner takes all</div>
              </div>
            </div>
          )}

          {/* Visual Helpers Status */}
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl">
            <span className="text-2xl">👁️</span>
            <div>
              <div className="font-semibold text-white">
                Visual Helpers: {showHelpers ? 'Enabled' : 'Disabled'}
              </div>
              <div className="text-sm text-gray-400">
                {showHelpers ? 'Selection highlights and drag arrows will be shown' : 'Clean gameplay without visual aids'}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ENHANCEMENT: Conditional rendering for wizard steps
  const renderContent = () => {
    if (currentStep === 'mode') {
      return renderModeStep()
    } else if (currentStep === 'config') {
      return renderConfigStep()
    } else if (currentStep === 'auth') {
      return renderAuthStep()
    } else {
      return renderSummaryStep()
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}

      <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-3 md:p-6">
        {/* ENHANCEMENT: Dynamic header */}
        <div className="flex justify-between items-start mb-3 md:mb-6">
          <div className="flex-1">
            <h1 className="text-xl md:text-3xl font-bold text-white mb-1">{getStepTitle()}</h1>
            <p className="text-gray-400 text-xs md:text-sm">{getStepDescription()}</p>
          </div>
          <button
            onClick={() => setShowLeaderboard(true)}
            className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl border border-white/10 transition-all flex items-center gap-2"
            title="View Leaderboard"
          >
            <span className="text-xl">🏆</span>
            <span className="hidden md:inline font-semibold text-sm">Leaderboard</span>
          </button>
        </div>

        {/* ENHANCEMENT: Progress Indicator */}
        <div className="flex items-center gap-2 mb-3 md:mb-6">
          {(['mode', 'config', 'auth', 'summary'] as const).map((step, idx) => (
            <div key={step} className="flex items-center gap-1 md:gap-2">
              <div 
                className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold transition-all ${
                  currentStep === step ? 'bg-blue-600 text-white' :
                  (['mode', 'config', 'auth', 'summary'] as const).indexOf(currentStep) > idx ? 'bg-green-600 text-white' :
                  'bg-white/10 text-gray-400'
                }`}
              >
                {(['mode', 'config', 'auth', 'summary'] as const).indexOf(currentStep) > idx ? '✓' : idx + 1}
              </div>
              {idx < 3 && (
                <div className={`w-4 md:w-8 h-1 rounded-full transition-all ${
                  (['mode', 'config', 'auth', 'summary'] as const).indexOf(currentStep) > idx ? 'bg-green-600' : 'bg-white/10'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* ENHANCEMENT: Step content */}
        <div className="mb-4 md:mb-6">
          {renderContent()}
        </div>

        {/* ENHANCEMENT: Navigation buttons */}
        <div className="flex justify-between items-center border-t border-white/10 pt-4 md:pt-6">
          <ButtonWithFeedback
            onClick={() => {
              if (currentStep === 'config') setCurrentStep('mode')
              else if (currentStep === 'auth') setCurrentStep('config')
              else if (currentStep === 'summary') setCurrentStep(gameMode === 'MULTIPLAYER' ? 'auth' : 'config')
            }}
            type="secondary"
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              currentStep === 'mode' 
                ? 'invisible' 
                : 'bg-white/10 hover:bg-white/20 text-gray-300'
            }`}
          >
            ← Back
          </ButtonWithFeedback>

          <ButtonWithFeedback
            onClick={() => {
              if (currentStep === 'mode' && gameMode !== 'SOLO_PRACTICE') {
                setCurrentStep('config')
              } else if (currentStep === 'config') {
                if (gameMode === 'MULTIPLAYER') {
                  setCurrentStep('auth')
                } else {
                  setCurrentStep('summary')
                }
              } else if (currentStep === 'auth') {
                setCurrentStep('summary')
              } else {
                handleStart()
              }
            }}
            disabled={!canProceed()}
            type="primary"
            size="large"
            className="flex items-center gap-2"
          >
            {currentStep === 'summary' ? 'Start Game' : 'Continue'}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </ButtonWithFeedback>
        </div>
      </div>
    </div>
  )
}

