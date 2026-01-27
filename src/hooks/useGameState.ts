/**
 * useGameState - Centralized Game State Management
 * 
 * Following Core Principles:
 * - DRY: Single source of truth for all game state
 * - CLEAN: Clear separation between state and UI
 * - MODULAR: Composable, testable state logic
 * 
 * This hook consolidates ~15 useState calls from Game.tsx into a unified state machine
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import { GameSettingsConfig } from '@/components/GameSettings';
import { GAME_MODES, TOWER_CONFIG } from '@/config';
import type { GameState as ServerGameState } from './useGameSocket';

export type GameStatus = 'WAITING' | 'ACTIVE' | 'VOTING' | 'ENDED' | 'COLLAPSED';

export interface Player {
  id: string;
  address: string;
  isAlive: boolean;
  isCurrentTurn: boolean;
}

export interface Survivor {
  address: string;
  isWinner: boolean;
}

export interface DragIndicator {
  x: number;
  y: number;
  length: number;
  angle: number;
}

export interface GameState {
  // Core game status
  status: GameStatus;
  gameOver: boolean;
  towerCollapsed: boolean;
  
  // Scoring
  score: number;
  fallenCount: number;
  potSize: number;
  
  // Players
  survivors: Survivor[];
  
  // UI State
  showRules: boolean;
  showHelpers: boolean;
  dragIndicator: DragIndicator | null;
  
  // Timer (for SOLO_COMPETITOR)
  timeLeft: number;
  
  // Timestamp for animations
  now: number;
}

export interface GameActions {
  // Game flow
  startGame: () => void;
  endGame: (collapsed?: boolean) => void;
  resetGame: () => void;
  
  // Scoring
  incrementScore: (amount?: number) => void;
  incrementFallen: (amount?: number) => void;
  setPotSize: (size: number | ((prev: number) => number)) => void;
  
  // Timer
  decrementTimer: () => boolean; // returns true if timer reached 0
  resetTimer: () => void;
  
  // UI
  setShowRules: (show: boolean) => void;
  setShowHelpers: (show: boolean) => void;
  setDragIndicator: (indicator: DragIndicator | null) => void;
  
  // Survivors
  setSurvivors: (survivors: Survivor[]) => void;
  
  // Update timestamp
  tick: () => void;
}

export interface UseGameStateReturn {
  state: GameState;
  actions: GameActions;
  // Derived values
  isActive: boolean;
  isEnded: boolean;
  totalBlocks: number;
  maxPlayers: number;
  isPractice: boolean;
}

export function useGameState(
  settings: GameSettingsConfig,
  serverState?: ServerGameState | null,
  serverTimeLeft?: number
): UseGameStateReturn {
  // Determine if this is a solo mode
  const isSolo = settings.gameMode.startsWith('SOLO');
  const isSoloCompetitor = settings.gameMode === GAME_MODES.SOLO_COMPETITOR.id;
  const isMultiplayer = settings.gameMode === GAME_MODES.MULTIPLAYER.id;
  
  // Core state
  const [gameOver, setGameOver] = useState(false);
  const [towerCollapsed, setTowerCollapsed] = useState(false);
  const [score, setScore] = useState(0);
  const [fallenCount, setFallenCount] = useState(0);
  const [potSize, setPotSizeState] = useState(0);
  const [survivors, setSurvivorsState] = useState<Survivor[]>([]);
  
  // UI state
  const [showRules, setShowRulesState] = useState(isSolo);
  const [showHelpers, setShowHelpersState] = useState(settings.showHelpers);
  const [dragIndicator, setDragIndicatorState] = useState<DragIndicator | null>(null);
  
  // Timer state (for SOLO_COMPETITOR)
  const initialTime = isSoloCompetitor 
    ? (GAME_MODES.SOLO_COMPETITOR.timerSeconds ?? 30)
    : 30;
  const [soloTimeLeft, setSoloTimeLeft] = useState<number>(initialTime);
  
  // Animation timestamp
  const [now, setNow] = useState(Date.now());
  
  // Refs for timer interval cleanup
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Derived status
  const status: GameStatus = useMemo(() => {
    if (gameOver) return towerCollapsed ? 'COLLAPSED' : 'ENDED';
    if (isSolo) return 'ACTIVE';
    return (serverState?.status as GameStatus) || 'WAITING';
  }, [gameOver, towerCollapsed, isSolo, serverState?.status]);
  
  // Derived timeLeft
  const timeLeft = useMemo(() => {
    if (isMultiplayer) return serverTimeLeft ?? 30;
    if (isSoloCompetitor) return soloTimeLeft;
    return 30; // SOLO_PRACTICE shows static 30
  }, [isMultiplayer, isSoloCompetitor, serverTimeLeft, soloTimeLeft]);
  
  // Derived max players
  const maxPlayers = useMemo(() => {
    if (isMultiplayer) return settings.playerCount;
    return (settings.aiOpponentCount || 1) + 1;
  }, [isMultiplayer, settings.playerCount, settings.aiOpponentCount]);
  
  // Actions
  const startGame = useCallback(() => {
    setGameOver(false);
    setTowerCollapsed(false);
    setScore(0);
    setFallenCount(0);
    setSurvivorsState([]);
    setSoloTimeLeft(initialTime);
    setShowRulesState(isSolo);
  }, [initialTime, isSolo]);
  
  const endGame = useCallback((collapsed = false) => {
    setGameOver(true);
    setTowerCollapsed(collapsed);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);
  
  const resetGame = useCallback(() => {
    setGameOver(false);
    setTowerCollapsed(false);
    setScore(0);
    setFallenCount(0);
    setSoloTimeLeft(initialTime);
    setSurvivorsState([]);
    setDragIndicatorState(null);
  }, [initialTime]);
  
  const incrementScore = useCallback((amount = 1) => {
    setScore(prev => prev + amount);
  }, []);
  
  const incrementFallen = useCallback((amount = 1) => {
    setFallenCount(prev => prev + amount);
  }, []);
  
  const setPotSize = useCallback((size: number | ((prev: number) => number)) => {
    setPotSizeState(size);
  }, []);
  
  const decrementTimer = useCallback((): boolean => {
    let reachedZero = false;
    setSoloTimeLeft(prev => {
      if (prev <= 1) {
        reachedZero = true;
        return 0;
      }
      return prev - 1;
    });
    return reachedZero;
  }, []);
  
  const resetTimer = useCallback(() => {
    setSoloTimeLeft(initialTime);
  }, [initialTime]);
  
  const setShowRules = useCallback((show: boolean) => {
    setShowRulesState(show);
  }, []);
  
  const setShowHelpers = useCallback((show: boolean) => {
    setShowHelpersState(show);
  }, []);
  
  const setDragIndicator = useCallback((indicator: DragIndicator | null) => {
    setDragIndicatorState(indicator);
  }, []);
  
  const setSurvivors = useCallback((newSurvivors: Survivor[]) => {
    setSurvivorsState(newSurvivors);
  }, []);
  
  const tick = useCallback(() => {
    setNow(Date.now());
  }, []);
  
  // Compile state object
  const state: GameState = useMemo(() => ({
    status,
    gameOver,
    towerCollapsed,
    score,
    fallenCount,
    potSize,
    survivors,
    showRules,
    showHelpers,
    dragIndicator,
    timeLeft,
    now,
  }), [status, gameOver, towerCollapsed, score, fallenCount, potSize, survivors, 
       showRules, showHelpers, dragIndicator, timeLeft, now]);
  
  // Compile actions object
  const actions: GameActions = useMemo(() => ({
    startGame,
    endGame,
    resetGame,
    incrementScore,
    incrementFallen,
    setPotSize,
    decrementTimer,
    resetTimer,
    setShowRules,
    setShowHelpers,
    setDragIndicator,
    setSurvivors,
    tick,
  }), [startGame, endGame, resetGame, incrementScore, incrementFallen, setPotSize,
       decrementTimer, resetTimer, setShowRules, setShowHelpers, setDragIndicator, 
       setSurvivors, tick]);
  
  return {
    state,
    actions,
    isActive: status === 'ACTIVE',
    isEnded: status === 'ENDED' || status === 'COLLAPSED',
    totalBlocks: TOWER_CONFIG.TOTAL_BLOCKS,
    maxPlayers,
    isPractice: isSolo,
  };
}
