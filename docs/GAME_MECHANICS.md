# Game Mechanics & Rules

## Game Modes

### Solo Practice Mode
- **Description**: Practice with no restrictions or time limits
- **Features**:
  - No timer
  - All blocks moveable (including top layers)
  - No scoring
  - No collapse penalties
  - Can reset tower anytime
- **Purpose**: Learn mechanics, test strategies, practice controls

### Solo Competitor Mode ⭐
- **Objective**: Remove as many blocks as possible in 30 seconds
- **Scoring Logic**: Block distance from tower center > 10 units = +1 score, timer resets
- **Game Over**: Tower collapse or timer runs out
- **On-chain Leaderboard**: Submit scores to smart contract, compete globally

#### Tower Configuration
- **16 layers**, 3 blocks per layer (48 blocks total)
- **Layers 0-13**: Normal blocks (blue) - **Moveable** ✓
- **Layers 14-15**: Locked blocks - **Cannot Touch** ✗
- **Block dimensions**: 5 units long × 1 unit tall × 1.5 units wide
- Layers alternate between X-axis and Z-axis orientation (Jenga-style)

#### Difficulty Levels

| Difficulty | Mass | Friction | Restitution | Damping | Description |
|-----------|------|----------|-------------|---------|-------------|
| **EASY** | 0.5 | 0.8 | 0.3 | 0.05 | Heavy, grippy blocks |
| **MEDIUM** | 1.0 | 0.5 | 0.4 | 0.02 | Balanced physics |
| **HARD** | 2.0 | 0.2 | 0.5 | 0.01 | Light, slippery blocks |

### Multiplayer Mode

#### Tower Structure
- **16 layers**, 3 blocks per layer (48 blocks total)
- **Block dimensions**: 6 units long × 1 unit tall × 1.5 units wide
- Jenga-style alternating orientation

#### Game Flow
1. **Waiting Phase**: Players join by staking 0.001 ETH, game waits for 2+ players
2. **Game Start**: First 2 players trigger ACTIVE state
3. **Active Play**: Players take 30-second turns removing blocks
4. **Turn Timeout**: Automatic end if no input within 30 seconds
5. **Collapse Detection**: If >40% of blocks fall, game ends
6. **Game End**: Survivors split pot equally

#### Key Constants
| Constant | Value |
|----------|-------|
| MAX_PLAYERS | 7 |
| ENTRY_STAKE | 0.001 ETH |
| RELOAD_COST | 0.001 ETH |
| MAX_RELOADS | 2 |
| TURN_DURATION | 30 seconds |
| COLLAPSE_THRESHOLD | 40% of blocks |

#### Reload System
- **Cost**: 0.001 ETH per reload
- **Max reloads**: 2 per game per player
- **Timing**: Can reload anytime during ACTIVE state
- **Effect**: Sets `isActive[player] = true` again

## Mobile Features & Optimization

### Mobile Gameplay Enhancements

#### 1. Auto-Dismiss Rules Dialog
- Dialog automatically closes when user tries to touch blocks
- Returns early on first tap (doesn't process as block interaction)
- Next tap works normally
- Prevents blocking gameplay on mobile

#### 2. Mobile-Optimized Dialog Design
- **Visual**: Yellow warning banner "⚠️ This dialog is blocking gameplay"
- **Close button**: Prominent with red background
- **Responsive**: Compact on mobile (p-4 md:p-8)
- **Scrollable**: max-h-[90vh] overflow-y-auto
- **Smaller text**: text-xs md:text-sm for mobile

#### 3. Enhanced Touch Controls

**Visual Block Selection**:
- Block glows green when selected
- Provides immediate visual confirmation
- Stores original color for restoration

**Haptic Feedback**:
- On touch: 10ms vibration when block selected
- On release: 10-50ms vibration proportional to drag strength
- Only activates on devices with vibration support

**Drag Indicator**:
- Green arrow overlay shows push direction
- Arrow length indicates force strength
- Power percentage displayed below arrow
- Gradient effect from solid to transparent
- Glowing drop shadow for visibility

**Touch Workflow**:
1. User taps block → Block glows green + vibrates
2. User drags → Green arrow shows direction + "X% Power" label
3. User releases → Stronger vibration + block flies in direction

#### 4. Smaller Help Button
- Reduced size on mobile: p-1.5 md:p-2
- Icon size: 16px mobile, 20px desktop
- Positioned higher on mobile: top-4 md:top-20
- Closer to edge: right-4 md:right-6

### Mobile Detection
```typescript
const [isMobile, setIsMobile] = useState(false)
useEffect(() => {
  const checkMobile = () => setIsMobile(window.innerWidth < 768)
  checkMobile()
  window.addEventListener('resize', checkMobile)
  return () => window.removeEventListener('resize', checkMobile)
}, [])
```

### 3D to 2D Projection for Overlay
Converts 3D block position to 2D screen coordinates for drag indicator:
```typescript
const screenStart = start.clone().project(camera)
const screenX = (screenStart.x + 1) / 2 * rect.width
const screenY = (1 - screenStart.y) / 2 * rect.height
```

## Contract Events

| Event | When | Data |
|-------|------|------|
| `GameCreated` | New game instance | gameId |
| `PlayerJoined` | Player joins | gameId, player |
| `GameStarted` | 2+ players join | gameId |
| `TurnChanged` | Turn advances | gameId, player, deadline |
| `PlayerEliminated` | Player knocked out | gameId, player, reason |
| `PlayerReloaded` | Player pays to rejoin | gameId, player |
| `GameCollapsed` | >40% blocks fallen | gameId |
| `GameEnded` | Game finished | gameId, winner, amount |
| `PotSplit` | Survivors split pot | gameId, amountPerPlayer |

## Core Contract Functions

### `joinGame() external payable`
- Requires: `msg.value == ENTRY_STAKE` (0.001 ETH)
- Requires: Game state is WAITING
- Requires: `players.length < MAX_PLAYERS`
- Effect: Adds player to game, auto-triggers start on 2nd join

### `completeTurn(gameId) external onlyOwner`
- Oracle calls after normal turn completion
- Advances to next active player

### `timeoutTurn(gameId) external onlyOwner`
- Oracle calls if player doesn't move within 30 seconds
- Eliminates current player

### `reload() external payable`
- Requires: `msg.value == RELOAD_COST` (0.001 ETH)
- Requires: Player is not currently active
- Requires: `reloadCount[player] < MAX_RELOADS`
- Effect: Sets player active again

### `reportCollapse(gameId) external onlyOwner`
- Oracle calls when >40% blocks have fallen
- Distributes pot equally among survivors
- Sets game to ENDED

## Security

- **ReentrancyGuard**: Protects all payable functions
- **Ownable**: Only owner (oracle) calls state-changing functions
- **Immutable constants**: Can't be changed mid-game
- **No private keys in code**: Uses environment variables

## Example Game Flow

```
Block 1000: Player A joins → PlayerJoined
Block 1001-1002: Player B joins → PlayerJoined (2 players)
                → GameStarted (state = ACTIVE)
                → TurnChanged (Player A, deadline = block 1032)

Frames 1000-1032: Player A drags blocks (30s turn)
  - Clients render at 60 FPS
  - Physics updates every frame
  - Server broadcasts state to all clients

Block 1032: Turn timeout
           → Oracle calls completeTurn()
           → TurnChanged (Player B, deadline = block 1062)

Block 1500: During Player C's turn, tower collapses
           → reportCollapse()
           → Survivors split pot
           → GameEnded event
           → New game created
```
