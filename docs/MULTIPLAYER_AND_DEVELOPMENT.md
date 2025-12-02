# Multiplayer & Development Guide

## Multiplayer Implementation

### Overview

The multiplayer system is fully implemented with server-authoritative turn management, spectator mode, and end-game states. The architecture follows **clean separation of concerns** with turn logic on server and UI rendering on client.

### Architecture

#### Server (Node.js + Express + Socket.io)

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

#### Frontend (Next.js + React + wagmi)

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

**UI Components:**
- `SpectatorOverlay`: Shows current player + timer when you're not playing
- `MultiplayerGameOver`: Collapse/end screen with winners & survivors

### Data Flow

#### Join Game
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

#### During Turn
```
Frontend: Current player drags block
  → handleInputEnd() computes force vector
  → Multiplayer check: only allow if isCurrentPlayer
  → emit 'submitMove' with blockIndex, force, point

Server: Receives submitMove
  → Verify this player's turn (compare wallet address)
  → Apply force to physics simulation
  → Broadcast physicsUpdate to all clients

Server: Turn timeout (30s)
  → Detect turnDeadline passed
  → Call endTurn()
  → Calculate next player
  → Broadcast new turn to all clients
```

### Socket.io Events

#### Client → Server
- `createGame`: Game settings selected
- `joinGame`: `playerAddress: string` - Player clicks "Join Game"
- `submitMove`: `{blockIndex, force, point}` - Player drags block
- `surrender`: `playerAddress: string` - Player exits voluntarily

#### Server → Client
- `gameState`: Full game state (any state change)
- `turnChanged`: `{player, deadline}` - New player's turn begins
- `physicsUpdate`: Array of block states (60 FPS)
- `gameCollapsed`: `{survivors: string[]}` - Tower collapse detected

### Multiplayer Game States

- **WAITING**: Game created but < 2 players
- **ACTIVE**: 2+ players confirmed, turn-based gameplay
- **COLLAPSED**: Tower falls below stability threshold
- **ENDED**: Only 1 player remains

### Testing Guide

#### Setup

1. **Terminal 1: Start Backend**
```bash
cd server
npm run dev
# Game Server running on port 3001
```

2. **Terminal 2: Start Frontend**
```bash
npm run dev
# Next.js running on http://localhost:3000
```

#### Basic Test Flow

1. **Browser 1**: Open `http://localhost:3000`, click "👥 Multiplayer", click "Start Game", click "Join Game"
2. **Browser 2**: Open `http://localhost:3000`, click "👥 Multiplayer", click "Start Game", click "Join Game"
3. **Expected**: Game ACTIVE, Player 1 has turn, 30s timer visible

**Expected Behavior:**
- ✅ Timer shows 30s countdown
- ✅ Only active player can drag blocks
- ✅ Other player sees spectator overlay with current player name
- ✅ When timer expires, turns auto-advance
- ✅ Physics updates visible to both (smooth block movement)

#### Scenario: Tower Collapse
1. Active player drags **many blocks rapidly**
2. When >40% of blocks fall below Y=0.5:
   - Server detects collapse
   - Status changes to "COLLAPSED"
   - Both browsers show `MultiplayerGameOver` modal

---

## Product Roadmap

### Vision
An infinite, multiplayer, blockchain-based physics game where players compete to remove blocks from a stack without causing it to collapse. Inspired by Jenga meets Chess.com meets DeFi.

---

### Core Game Mechanics

#### Turn-Based Gameplay
- Players join a queue by staking USDC (Linea Sepolia)
- Each player gets **X seconds** to remove one block
- Game starts when **N players** join the queue
- Miss your turn → forfeit stake to pot
- **Reload:** Players can manually sign a transaction to reload their stake if they lose (max N times)
- Stack collapses (≥40% blocks hit floor) → game ends, all active players forfeit stakes

#### MVP Scope (Phase 1)

#### Core Features ✅
- [x] Basic physics-based block stacking
- [x] **Mobile-First Design:** Touch controls, portrait/landscape support
- [ ] Turn-based queue system (7 max players)
- [ ] Timer per turn (30 seconds recommended)
- [x] Standard Wallet Connection (RainbowKit)
- [ ] USDC staking on Linea Sepolia
- [ ] Manual Reloads (Standard Transaction)
- [ ] Collapse detection (40% threshold)
- [ ] Post-game voting (split vs continue)
- [ ] Spectator mode (watch only, no betting)

#### Game Parameters (MVP)
| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Max Players | 7 | Manageable for MVP, creates good pot size |
| Turn Timer | 30s | Enough time to strategize, not too slow |
| Stake Amount | 1 USDC | Low barrier to entry |
| Reloads | Max 2 | Manual transaction to re-enter |
| Collapse Threshold | 40% | Balance between difficulty and playability |
| Block Restrictions | No bottom row | Prevents instant game-over |
| Physics Difficulty | Medium | Fixed for MVP, tunable later |

### Next Steps

#### Immediate (1-2 Weeks)
1. **Leaderboard Page** (`/leaderboard`)
   - Full top 10/25/50 display
   - Filter by difficulty tabs
   - Search for addresses
   - Personal stats dashboard

2. **Social Features**
   - Share score on Twitter/Farcaster
   - "Challenge Friend" functionality
   - Replay viewing

3. **Solo Mode Enhancements**
   - Historical score trends chart
   - Weekly high score resets
   - Achievements system

#### Short-Term (1-2 Months)
- Complete multiplayer oracle integration
- Multiple concurrent multiplayer games
- Spectator mode
- Tournament system