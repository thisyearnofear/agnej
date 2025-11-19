# Architecture & System Design

## System Overview

```
┌─────────────────────┐
│   Frontend (Next.js) │
│  Three.js + Physijs │
└──────────┬──────────┘
           │ Socket.io
           │ (moves, state)
┌──────────▼──────────┐
│  Game Server        │
│  Express + Socket.io│
│  Cannon.js (physics)│
└──────────┬──────────┘
           │ RPC calls
           │ (completeTurn, etc)
┌──────────▼──────────┐
│ Smart Contract      │
│ (Linea Sepolia)     │
└─────────────────────┘
```

## Frontend-Server Communication

### WebSocket Events (Socket.io)

**Client → Server:**
- `submitMove`: Player applies force to block
  - Data: `{ blockIndex, force: {x, y, z}, point: {x, y, z} }`
- `playerAction`: Game state updates (join, reload)

**Server → Client:**
- `gameStateUpdate`: Full game state every frame
  - Data: Players, turns, game phase
- `physicsUpdate`: Block positions/rotations (60 FPS)
  - Data: Array of blocks with position, quaternion, velocity
- `turnChanged`: New player's turn
  - Data: `{ player, deadline }`
- `gameCollapsed`: Tower collapse detected
  - Data: `{ reason, survivors }`

### Fallback
- Mock data when server unavailable (MVP)
- Clients continue rendering with last-known state

## Physics System

### Server Physics (Authoritative - Cannon.js)

- **Physics engine:** Cannon.js (deterministic)
- **Update rate:** 60 FPS (16.67ms per step)
- **Gravity:** -30 m/s²
- **Block mass:** 1 unit each
- **Block friction:** 0.4 (contact friction)
- **Block restitution:** 0.4 (bounciness)
- **Damping:** 0.05 linear, 0.05 angular (stabilizes tower)
- **Table friction:** 0.9 (static, immovable)
- **Collapse detection:** Block falls below y < 0.5 (table surface)

### Client Physics (Physijs/Three.js)

- Mirrors server physics for visual representation
- User input: Click/drag blocks to apply force
- Force magnitude: `dragDistance × 10` (normalized)
- No local prediction (render server state directly)
- Latency: ~50-200ms depending on network

### Synchronization

1. Player drags block on client
2. Client sends `submitMove` with force vector
3. Server applies force in physics simulation
4. Server updates all block states in Cannon.js
5. Server broadcasts new block states to all clients
6. Clients render server state via Three.js
7. Loop repeats 60 times per second

**Key principle:** Server is authoritative. All physics truth lives on server.

## Oracle Service (Backend)

The Express server acts as a trusted oracle monitoring the game and calling smart contract functions.

### Responsibilities

1. **Listen to events:** Watch contract for `PlayerJoined`, `GameStarted`, `TurnChanged`
2. **Maintain state:** Keep local copy of game state from events
3. **Monitor physics:** Check physics simulation every frame for collapse
4. **Enforce timeouts:** Track turn duration, eliminate inactive players
5. **Report events:** Call contract functions to advance on-chain state

### Oracle Functions Called

| Function | When | Effect |
|----------|------|--------|
| `completeTurn(gameId)` | Turn timer expires, no collapse | Next player's turn |
| `timeoutTurn(gameId)` | Player inactive >30 seconds | Current player eliminated |
| `reportCollapse(gameId)` | Physics detects >40% blocks fallen | Distribute pot to survivors |

### Authentication

- Uses private key: `ORACLE_PRIVATE_KEY` env var
- Only contract owner can call oracle functions
- All transactions signed with owner wallet on Linea Sepolia
- RPC: `https://rpc.sepolia.linea.build`

## Server Architecture

```
server/
├── src/
│   ├── index.ts           # Express + Socket.io setup
│   ├── physics.ts         # Cannon.js simulation
│   ├── services/
│   │   └── blockchain.ts  # Contract calls, ABI
│   └── abi.ts             # Contract ABI definitions
└── package.json
```

### Game Server State (In-Memory)

```typescript
interface GameState {
  gameId: number;
  phase: "waiting" | "active" | "collapsed" | "voting" | "ended";
  players: Player[];
  blocks: Block[];
  physics: Cannon.World;  // Authoritative world state
  currentPlayer: Player;
  currentTurnStart: number;
  pot: number;
}
```

**Note:** Currently in-memory only. Future: persist to database (PostgreSQL/Firestore).

## Frontend Architecture

```
src/
├── app/
│   └── (routes & pages)
├── components/
│   ├── Game.tsx           # 3D canvas, Three.js
│   ├── GameUI.tsx         # Turn timer, player list
│   └── (other UI)
├── hooks/
│   ├── useGameContract.ts # Web3 contract calls
│   ├── useGameSocket.ts   # Socket.io connection
│   └── (other hooks)
├── lib/
│   └── (utilities)
└── abi/
    └── (contract ABIs)
```

### Web3 Integration

- **Wallet:** RainbowKit + wagmi
- **Contract calls:** Viem (read/write)
- **Data fetching:** TanStack Query
- **Supported chains:** Linea Sepolia (testnet)

## Turn Flow Diagram

```
1. TurnChanged event
   ├─ Set currentPlayer
   └─ Deadline = block.timestamp + 30

2. During turn (0-30 sec)
   ├─ Player drags block → submitMove
   ├─ Server updates physics
   ├─ Server broadcasts state 60× per sec
   └─ Clients render

3. At deadline (30 sec)
   ├─ Check collapse? 
   │  ├─ YES → reportCollapse()
   │  │          ├─ Distribute pot
   │  │          └─ GameEnded
   │  └─ NO → Check timeout?
   │           ├─ YES → timeoutTurn()
   │           │         └─ Player eliminated
   │           └─ NO → completeTurn()
   │                   └─ Next player
   
4. TurnChanged event (repeat)
```

## Deployment Checklist

### Smart Contract
- [ ] Deploy `HouseOfCards.sol` to Linea Sepolia
- [ ] Update contract address in `useGameContract.ts`
- [ ] Verify contract on block explorer
- [ ] Set oracle owner to backend service address

### Backend
- [ ] Set `ORACLE_PRIVATE_KEY` env var
- [ ] Deploy to hosting (Vercel, Railway, etc.)
- [ ] Configure Linea RPC endpoint
- [ ] Enable Socket.io CORS for frontend domain

### Frontend
- [ ] Update contract address in config
- [ ] Update RPC endpoint (if using custom)
- [ ] Deploy to Vercel
- [ ] Test wallet connection
- [ ] Test game flow end-to-end

## Performance Notes

- **Physics:** 60 FPS server, 60 FPS client (target)
- **Network:** Full state broadcast every frame (may need optimization at scale)
- **Blockchain:** Turn changes ~every 30 seconds (low frequency)
- **Scalability:** Currently single game instance. Future: queue system + multiple concurrent games

---

See [GAME_MECHANICS.md](GAME_MECHANICS.md) for smart contract details and [SETUP.md](SETUP.md) for development instructions.
