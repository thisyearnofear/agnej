# Agnej Multiplayer Implementation Guide

## Overview

The multiplayer system is fully implemented with server-authoritative turn management, spectator mode, and end-game states. The architecture follows **clean separation of concerns** with turn logic on server and UI rendering on client.

## Architecture

### Server (Node.js + Express + Socket.io)

**Core Responsibilities:**
- Physics simulation (Cannon.js) at 60 FPS
- Turn management with 30-second timer
- Player state tracking (active, eliminated)
- Broadcast physics updates & game state

**Key Entities:**
- `GameState`: Central source of truth with wallet addresses
- `playerSockets`: Maps wallet addresses to Socket.io IDs
- `activePlayers`: Set of remaining players
- `currentPlayer`: Wallet address of current player
- `turnDeadline`: Unix timestamp for turn timeout

**Game Flow:**
```
WAITING → createGame() → ACTIVE → startTurn() → 
  → player moves (submitMove) → 30s timer → endTurn() → 
  → next player OR collapse/end
```

### Frontend (Next.js + React + wagmi)

**Socket.io Hook (`useGameSocket`):**
- Connects only for MULTIPLAYER mode
- Server provides:
  - `gameState`: Full game state (players, currentPlayer, status)
  - `physicsUpdate`: Block positions (60 FPS)
  - `turnChanged`: New player's turn
  - `gameCollapsed`: Tower collapse detection
- Client manages:
  - Turn countdown timer
  - Physics rendering via Three.js
  - Player input blocking during spectator mode

**Game Component (`Game.tsx`):**
- Routes game mode to appropriate logic
- Multiplayer-specific features:
  - `isCurrentPlayer`: Check if this wallet's turn
  - `isSpectator`: Visual/control restrictions
  - Input blocking for spectators
  - Multiplayer game-over handling

**UI Components:**
- `SpectatorOverlay`: Shows current player + timer when you're not playing
- `MultiplayerGameOver`: Collapse/end screen with winners & survivors

## Data Flow

### Join Game
```
Frontend: User clicks "Join Game"
  → useGameSocket.joinGame() 
  → emit 'joinGame' with wallet address
  
Server: Receives joinGame event
  → Add address to game.players & activePlayers
  → Map socket.id to address in playerSockets
  → If 2+ players, start game (ACTIVE, startTurn)
  
Frontend: Receives gameState update
  → Players array populated
  → Game transitions to ACTIVE
  → First player gets turn
```

### During Turn
```
Frontend: Current player drags block
  → handleInputEnd() computes force vector
  → Multiplayer check: only allow if isCurrentPlayer
  → emit 'submitMove' with blockIndex, force, point
  
Server: Receives submitMove
  → Verify this player's turn (compare wallet address)
  → Apply force to physics simulation
  → Broadcast physicsUpdate to all clients
  
Frontend: Receives physicsUpdate (60 FPS)
  → Apply block positions/rotations to Three.js
  → Render visual feedback
  
Server: Turn timeout (30s)
  → Detect turnDeadline passed
  → Call endTurn()
  → Calculate next player
  → Broadcast new turn to all clients
```

### Tower Collapse
```
Server Physics Loop: detects blocks falling below threshold
  → setStatus('COLLAPSED')
  → Identify survivors in activePlayers
  → Broadcast gameCollapsed event
  
Frontend: Receives status='COLLAPSED'
  → Calculate winner (first in survivors)
  → Show MultiplayerGameOver with:
    - Winner badge
    - Survivor list with medals
    - Pot distribution info
  → Block all input
```

### Mid-Game Elimination
```
When players disconnect or surrender:
Server: Receives disconnect or surrender event
  → Remove from activePlayers
  → If 1 or fewer remain, status='ENDED'
  → Next turn logic uses remaining players
  
Frontend: Becomes spectator
  → isSpectator = true
  → SpectatorOverlay shows
  → Input blocked
  → Can still watch game
```

## Socket.io Events

### Client → Server

| Event | Data | When |
|-------|------|------|
| `createGame` | `{maxPlayers, difficulty, stake, isPractice}` | Game settings selected |
| `joinGame` | `playerAddress: string` | Player clicks "Join Game" |
| `submitMove` | `{blockIndex, force, point}` | Player drags block (only valid if current turn) |
| `surrender` | `playerAddress: string` | Player exits voluntarily |

### Server → Client

| Event | Data | When |
|-------|------|------|
| `gameState` | Full `GameState` (sanitized) | Any state change |
| `turnChanged` | `{player, deadline}` | New player's turn begins |
| `physicsUpdate` | Array of block states (60 FPS) | Physics simulation step |
| `gameCollapsed` | `{survivors: string[]}` | Tower collapse detected |

## Multiplayer Game States

### WAITING
- Game created but < 2 players
- Players see "Join Game" button
- No timer, no physics

### ACTIVE
- 2+ players confirmed
- Turn-based gameplay
- 30s per turn
- Physics running
- Input restrictions: only current player can move blocks

### COLLAPSED
- Tower falls below stability threshold (>40% blocks fallen)
- Survivors determined
- Winner is last survivor standing
- All players see end screen with results

### ENDED
- Only 1 player remains (others disconnected/surrendered)
- Remaining player(s) win
- Game over screen shown

## UI Components

### SpectatorOverlay
Shows when you're watching (not your turn):
- Current player's wallet address
- 30s countdown timer
- Remaining players list
- Visual pulse effect as time counts down

### MultiplayerGameOver
Shows when game ends:
- Collapse/end reason
- "You Won" banner (if winner)
- Survivor list with medals (🥇🥈🥉)
- Prize pool distribution
- "Play Again" and "Back to Menu" buttons

## Frontend State Management

### In Game.tsx

```typescript
// Server-derived
const isCurrentPlayer = serverState?.currentPlayer?.toLowerCase() === address?.toLowerCase()
const isSpectator = gameState === 'ACTIVE' && !isCurrentPlayer

// Local
const [survivors, setSurvivors] = useState([])
const [towerCollapsed, setTowerCollapsed] = useState(false)
const [gameOver, setGameOver] = useState(false)

// Effects
useEffect(() => {
  // Listen for serverState changes
  if (serverState?.status === 'COLLAPSED') {
    setTowerCollapsed(true)
    setSurvivors([...])
    setGameOver(true)
  }
}, [serverState?.status, serverState?.activePlayers])
```

## Important Implementation Details

### Player Identification
- **Server**: Uses wallet addresses (from `joinGame` event)
- **Server**: Maps addresses to Socket.io IDs in `playerSockets` Map
- **Frontend**: Uses `useAccount().address` from wagmi
- **Comparison**: Case-insensitive (`.toLowerCase()`)

### Move Validation
- Server checks if `playerAddress === currentPlayer`
- Rejects moves during wrong player's turn
- Future: Could queue moves for fairness

### Physics Determinism
- Server runs Cannon.js with fixed timestep (1/60)
- All clients render received positions (no client-side prediction)
- Ensures all players see same state

### Spectator Features
- Can watch the game in real-time
- Sees current player highlight
- Sees turn timer countdown
- Cannot interact with physics
- Automatically in view when not active

## Testing Checklist

### Local Testing (2 browsers on localhost)
- [ ] Start server: `cd server && npm run dev`
- [ ] Start frontend: `npm run dev`
- [ ] Open http://localhost:3000 in 2 browsers
- [ ] Both connect wallet (same or different)
- [ ] Browser 1: Select MULTIPLAYER, 2 players, click Start Game
- [ ] Browser 1: Click "Join Game"
- [ ] Browser 2: See game state update with 1 player
- [ ] Browser 2: Click "Join Game"
- [ ] Both see: Game ACTIVE, Player 1 has turn, 30s timer
- [ ] Player 1: Drag a block → physics update all clients
- [ ] Player 2: Try to drag → blocked (not your turn)
- [ ] Player 1: Spectator overlay appears after timer expires
- [ ] Player 2: Now shows active turn
- [ ] Trigger collapse: Drag many blocks down
- [ ] Both see: Game Over screen with survivors

### Edge Cases
- [ ] Disconnect mid-game → other players continue
- [ ] No moves during turn → auto-advance
- [ ] Browser refresh → reconnect, see game state
- [ ] Different chain wallets → multiple games possible

## Future Enhancements

1. **Database Persistence**
   - Replace in-memory `currentGameState` with PostgreSQL
   - Persist game history for analytics
   - Enable multiple concurrent games

2. **Advanced Physics**
   - Delta-update physics (only changed blocks)
   - Reduce bandwidth from 60 FPS full state

3. **AI Opponents**
   - Bot players for SINGLE_VS_AI mode
   - Naive AI: random block selection
   - Smart AI: target stability-critical blocks

4. **Smart Contract Integration**
   - Track game results on-chain
   - Automatic pot distribution to winner
   - Tournament mode with leaderboards

5. **Spectator Betting**
   - Third-party observation
   - Optional: Place bets on outcomes
   - Earn from pool if correct

## Common Issues & Solutions

### "Move from unknown player socket"
- **Cause**: Player not in `playerSockets` map
- **Solution**: Ensure `joinGame` called before `submitMove`

### Turn doesn't advance
- **Cause**: `endTurn()` not called at deadline
- **Check**: Server physics loop running? Deadline in past?

### Physics doesn't sync
- **Cause**: Client doesn't receive `physicsUpdate`
- **Check**: Is socket connected? Server status ACTIVE?

### Spectator overlay doesn't show
- **Cause**: `isSpectator` calculation wrong
- **Check**: `isCurrentPlayer` accurate? Address lowercase?

---

**Last Updated:** 2025-12-01  
**Status:** ✅ MVP Complete, tested locally
