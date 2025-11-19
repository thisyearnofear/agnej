# Game Mechanics

## Tower Structure

- **16 layers**, 3 blocks per layer (48 blocks total)
- Layers alternate between X-axis and Z-axis orientation (Jenga-style)
- **Block dimensions:** 6 units long × 1 unit tall × 1.5 units wide
- **Physics:** Gravity (-30 m/s²), friction (0.4), collision detection enabled

## Gameplay Loop

### Phase 1: Waiting
- Players join and pay entry stake (0.001 ETH)
- Game waits for MAX_PLAYERS (7) to join
- `PlayerJoined` event emitted per player

### Phase 2: Game Starts
- 7th player joins → `GameStarted` event
- `TurnChanged` event with deadline = block.timestamp + 30 seconds
- First player gets 30-second turn

### Phase 3: Active Play
- Current player clicks/drags blocks to apply forces
- Force calculated from drag distance and direction
- Server physics runs at 60 FPS, broadcasts to all clients every frame
- Turn timer visible on UI (30s countdown)
- Server checks each frame for collapse (>40% blocks fallen)

### Phase 4: Turn Transitions
**Normal end** (no collapse): Oracle calls `completeTurn()`
- Next active player's turn begins
- `TurnChanged` emitted with new deadline

**Timeout** (player inactive): Oracle calls `timeoutTurn()`
- Current player eliminated with reason "Timeout"
- Next player's turn begins

**Collapse detected** (>40% blocks below table): Oracle calls `reportCollapse()`
- Current player implicitly eliminated
- Game state → `VOTING`
- Survivors split pot equally
- `GameEnded` event triggers payout
- New game created automatically

## Reload System

- **Cost:** 0.001 ETH per reload
- **Max reloads:** 2 per game per player
- **Timing:** Can reload anytime during `ACTIVE` game state
- **Effect:** Sets `isActive[player] = true` again
- **Event:** `PlayerReloaded` emitted on-chain

## Key Constants

| Constant | Value |
|----------|-------|
| MAX_PLAYERS | 7 |
| ENTRY_STAKE | 0.001 ETH |
| RELOAD_COST | 0.001 ETH |
| MAX_RELOADS | 2 |
| TURN_DURATION | 30 seconds |
| COLLAPSE_THRESHOLD | 40% (0.4) of blocks |

## Smart Contract State

### Game Struct

```solidity
struct Game {
    uint256 id;                           // Unique game ID
    GameState state;                      // WAITING, ACTIVE, VOTING, ENDED
    uint256 pot;                          // Total ETH in pot
    uint256 turnDuration;                 // 30 seconds
    uint256 startTime;                    // Block timestamp game started
    uint256 lastMoveTime;                 // Block timestamp of last move
    address currentPlayer;                // Player whose turn it is
    uint256 currentTurnIndex;             // Index in players array
    address[] players;                    // All players who joined
    mapping(address => bool) isActive;    // Still in game?
    mapping(address => uint256) reloadCount; // Times reloaded
    uint256 collapseThreshold;            // 0.4 (40%)
}
```

### Game States

- **WAITING:** Accepting player joins
- **ACTIVE:** Game in progress, physics running
- **VOTING:** Collapse detected, distributing pot
- **ENDED:** Game finished, new game created

## Contract Events

| Event | When | Data |
|-------|------|------|
| `GameCreated` | New game instance | gameId |
| `PlayerJoined` | Player joins | gameId, player |
| `GameStarted` | 7th player joins | gameId |
| `TurnChanged` | Turn advances | gameId, player, deadline |
| `PlayerEliminated` | Player knocked out | gameId, player, reason |
| `PlayerReloaded` | Player pays to rejoin | gameId, player |
| `GameCollapsed` | >40% blocks fallen | gameId |
| `GameEnded` | Game finished | gameId, winner, amount |
| `PotSplit` | Survivors split pot | gameId, amountPerPlayer |

## Core Contract Functions

### `joinGame() external payable`
- Requires: `msg.value == ENTRY_STAKE` (0.001 ETH)
- Requires: Game state is `WAITING`
- Requires: `players.length < MAX_PLAYERS`
- Effect: Adds player to `players[]`, sets `isActive[player] = true`
- Auto-triggers `_startGame()` on 7th join

### `completeTurn(gameId) external onlyOwner`
- Oracle calls after normal turn completion
- Advances to next active player

### `timeoutTurn(gameId) external onlyOwner`
- Oracle calls if player doesn't move within 30 seconds
- Eliminates current player with reason "Timeout"

### `reload() external payable`
- Requires: `msg.value == RELOAD_COST` (0.001 ETH)
- Requires: Player is not currently active
- Requires: `reloadCount[player] < MAX_RELOADS` (2)
- Effect: Sets `isActive[player] = true`, increments reload count

### `reportCollapse(gameId) external onlyOwner`
- Oracle calls when physics detects >40% blocks fallen
- Distributes pot equally among survivors
- Sets state to `ENDED`, creates new game

## Security

- **ReentrancyGuard:** Protects all payable functions
- **Ownable:** Only owner (oracle) calls state-changing functions
- **Immutable constants:** Can't be changed mid-game

## Timing Example

```
Block 1000: Player A joins → PlayerJoined
Block 1001-1006: Players B-F join → 6× PlayerJoined
Block 1007: 7th player joins
           → GameStarted (state = ACTIVE)
           → TurnChanged (deadline = block 1037)
           
Frame Loop: Player A has turn until block 1037
  - Clients render at 60 FPS
  - Physics updates every frame
  - Broadcast block states to all clients
  
Block 1037: Oracle checks deadline
           → If normal: completeTurn() → TurnChanged for Player B
           → If timeout: timeoutTurn() → Player A eliminated
           
Block 2500: During Player C's turn, tower collapses
           → reportCollapse() 
           → Survivors split pot
           → GameEnded event
           → GameCreated event (game 2 starts)
```

---

See [ARCHITECTURE.md](ARCHITECTURE.md) for physics details and oracle integration.
