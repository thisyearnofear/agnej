import React from "react";
import { TOWER_CONFIG, GAME_MODES } from "@/config";
import type { GameState as CentralizedGameState, Player, Survivor } from "@/hooks/useGameState";

export type GameState = "WAITING" | "ACTIVE" | "VOTING" | "ENDED" | "COLLAPSED";

export { type Player };

interface GameUIProps {
  // Centralized state (from useGameState)
  state: CentralizedGameState;
  // Additional props not in state
  players: Player[];
  currentPlayerId?: string;
  maxPlayers: number;
  difficulty: string;
  stake: number;
  gameMode: string;
  highScore: number;
  totalBlocks?: number;
  // Actions
  onJoin: () => void;
  onReload: () => void;
  onVote: (split: boolean) => void;
  onExit?: () => void;
  setShowRules: (show: boolean) => void;
  setShowHelpers: (show: boolean) => void;
}

export default function GameUI({
  state,
  players,
  currentPlayerId: _currentPlayerId,
  maxPlayers,
  difficulty,
  stake,
  gameMode,
  highScore,
  totalBlocks = TOWER_CONFIG.TOTAL_BLOCKS,
  onJoin,
  onReload,
  onVote,
  onExit,
  setShowRules,
  setShowHelpers,
}: GameUIProps) {
  const { 
    status: gameState, 
    potSize, 
    timeLeft, 
    fallenCount, 
    score, 
    showRules, 
    showHelpers 
  } = state;

  const [scoreJuice, setScoreJuice] = React.useState(false);
  const [localShowRules, setLocalShowRules] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [uiManuallyHidden, setUiManuallyHidden] = React.useState(false);
  const hideTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Detect mobile on mount
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-hide UI on mobile during active gameplay
  React.useEffect(() => {
    if (uiManuallyHidden || gameState !== "ACTIVE") {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      return;
    }

    const handleInteraction = () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };

    if (isMobile) {
      window.addEventListener("touchstart", handleInteraction);
      window.addEventListener("mousedown", handleInteraction);
    }

    return () => {
      if (isMobile) {
        window.removeEventListener("touchstart", handleInteraction);
        window.removeEventListener("mousedown", handleInteraction);
      }
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [uiManuallyHidden, gameState, isMobile]);

  const isRulesVisible = showRules;
  const toggleRules = () => setShowRules(!isRulesVisible);
  const closeRules = () => setShowRules(false);

  // Score animation
  const prevScoreRef = React.useRef(score);
  React.useEffect(() => {
    if (score > prevScoreRef.current) {
      setScoreJuice(true);
      const timer = setTimeout(() => setScoreJuice(false), 500);
      return () => clearTimeout(timer);
    }
    prevScoreRef.current = score;
  }, [score]);

  const formatAddress = (addr: string) => addr.slice(0, 6) + "..." + addr.slice(-4);
  const stability = Math.max(0, 100 - (fallenCount / totalBlocks / 0.4) * 100);
  const uiOpacity = gameState === "ACTIVE" && uiManuallyHidden ? "opacity-10" : "opacity-100";
  const uiTransition = "transition-opacity duration-300";

  const isSoloMode = gameMode?.startsWith("SOLO");
  const isPractice = isSoloMode;
  const isSoloCompetitor = gameMode === GAME_MODES.SOLO_COMPETITOR.id;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6">
      {/* Top Bar */}
      <div className={`flex justify-between items-start pointer-events-auto ${uiTransition} ${uiOpacity}`}>
        <div className="flex gap-4">
          {onExit && (
            <button
              onClick={onExit}
              className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-white hover:bg-red-500/20 hover:border-red-500/50 transition-all group"
              title="Exit to Menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-red-400">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
            </button>
          )}
          
          {gameState === "ACTIVE" && (
            <button
              onClick={() => {
                setUiManuallyHidden(!uiManuallyHidden);
                if (hideTimerRef.current) {
                  clearTimeout(hideTimerRef.current);
                  hideTimerRef.current = null;
                }
              }}
              className={`bg-black/40 backdrop-blur-md border rounded-xl p-4 text-white transition-all ${!uiManuallyHidden ? "border-green-500/50 text-green-400" : "border-white/10 text-gray-400"}`}
            >
              {!uiManuallyHidden ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
              )}
            </button>
          )}

          {/* Status Card */}
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-white">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full animate-pulse ${
                gameState === "ACTIVE" ? "bg-green-500" :
                gameState === "WAITING" ? "bg-yellow-500" :
                gameState === "COLLAPSED" ? "bg-red-500" :
                "bg-blue-500"
              }`} />
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">
                  {isPractice ? "Practice Mode" : "Tactical Briefing"}
                </div>
                <div className="text-lg font-bold">
                  {gameState === "WAITING" && "Waiting for Players..."}
                  {gameState === "ACTIVE" && "🎯 Game in Progress"}
                  {gameState === "VOTING" && "🗳️ Voting Phase"}
                  {gameState === "ENDED" && "🏁 Game Over"}
                  {gameState === "COLLAPSED" && "💥 Tower Collapsed!"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Pot / Score */}
        <div className="flex gap-4">
          {isSoloCompetitor && score !== undefined && (
            <div className={`bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-white transition-transform ${scoreJuice ? "scale-110" : ""}`}>
              <div className="text-xs text-gray-400 uppercase tracking-wider">Score</div>
              <div className="text-2xl font-bold text-yellow-400">{score}</div>
            </div>
          )}
          
          {!isPractice && (
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-white">
              <div className="text-xs text-gray-400 uppercase tracking-wider">Pot Size</div>
              <div className="text-2xl font-bold text-green-400">${potSize.toFixed(2)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Center: Timer */}
      {gameState === "ACTIVE" && timeLeft !== undefined && (isSoloCompetitor || gameMode === GAME_MODES.MULTIPLAYER.id) && (
        <div className={`absolute top-24 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-2 ${uiTransition} ${uiOpacity}`}>
          <div className={`text-4xl font-black drop-shadow-lg transition-colors duration-300 ${timeLeft <= 10 ? "text-red-500 animate-pulse" : "text-white"}`}>
            {timeLeft}s
          </div>
          <div className="w-64 h-2 bg-black/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
            <div className={`h-full transition-all duration-1000 ease-linear ${timeLeft <= 10 ? "bg-red-500" : "bg-blue-400"}`} style={{ width: `${(timeLeft / 30) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Bottom: Controls & Info */}
      <div className={`flex flex-col md:flex-row gap-4 items-end pointer-events-auto ${uiTransition} ${uiOpacity}`}>
        {/* Player List */}
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-4 text-white flex-1 max-w-md">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wider">
              Players ({players.length}/{maxPlayers})
            </span>
            {fallenCount > 0 && (
              <span className="text-xs text-red-400">{fallenCount} blocks fallen</span>
            )}
          </div>
          
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {players.map((player) => (
              <div key={player.id} className={`flex items-center justify-between p-2 rounded text-sm ${player.isCurrentTurn ? "bg-white/10 border border-yellow-500/50" : "bg-white/5"}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${player.isAlive ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="font-mono text-xs">{formatAddress(player.address)}</span>
                </div>
                {player.isCurrentTurn && <span className="text-xs text-yellow-400 font-bold">TURN</span>}
              </div>
            ))}
          </div>

          {/* Stability Bar */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Stability</span>
              <span>{stability.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-500 ${stability > 60 ? "bg-green-500" : stability > 30 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${stability}%` }} />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          {gameState === "WAITING" && (
            <button onClick={onJoin} className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105">
              🎮 Join Game
            </button>
          )}
          
          {gameState === "ACTIVE" && (
            <>
              <button onClick={onReload} className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all transform hover:scale-105">
                🔄 Reload
              </button>
              <button onClick={() => onVote(true)} className="bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all">
                💰 Vote Split
              </button>
            </>
          )}

          {/* Settings */}
          <div className="flex gap-2">
            <button onClick={toggleRules} className="bg-black/40 backdrop-blur-md border border-white/10 rounded-lg p-3 text-white hover:bg-white/10 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </button>
            <button onClick={() => setShowHelpers(!showHelpers)} className={`backdrop-blur-md border rounded-lg p-3 transition-colors ${showHelpers ? "bg-green-500/20 border-green-500/50 text-green-400" : "bg-black/40 border-white/10 text-white hover:bg-white/10"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Rules Modal */}
      {isRulesVisible && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-white/20 p-8 rounded-2xl max-w-lg w-full shadow-2xl">
            <h2 className="text-3xl font-black mb-4 text-white">
              {isPractice ? "🎯 Practice Mode" : "🏆 Competitor Mode"}
            </h2>
            
            <div className="space-y-4 text-gray-300 mb-6">
              <p>Welcome to Agnej - a physics-based tower game!</p>
              
              <div className="bg-white/5 rounded-lg p-4 space-y-2">
                <h3 className="font-bold text-white">How to Play:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Click and drag blocks to pull them from the tower</li>
                  <li>Longer drags = stronger pulls</li>
                  <li>Green arrow shows pull direction and strength</li>
                  <li>Don't let the tower collapse!</li>
                </ul>
              </div>

              {isSoloCompetitor && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <h3 className="font-bold text-yellow-400">🏆 Competitor Rules:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                    <li>30 second timer - score as many points as you can!</li>
                    <li>Knock blocks off the table to score points</li>
                    <li>Top 2 layers are locked (can't be moved)</li>
                    <li>Game ends if locked blocks fall</li>
                  </ul>
                </div>
              )}

              <div className="bg-blue-500/10 rounded-lg p-4">
                <p className="text-sm"><strong>Difficulty:</strong> {difficulty}</p>
                <p className="text-sm"><strong>Mode:</strong> {gameMode.replace(/_/g, " ")}</p>
                {!isPractice && <p className="text-sm"><strong>Stake:</strong> ${stake} USDC</p>}
              </div>
            </div>

            <button onClick={closeRules} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 rounded-xl transition-all transform hover:scale-105">
              Got it! Let's Play 🎮
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
