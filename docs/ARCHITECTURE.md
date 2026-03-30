# Agnej Architecture Overview

> **Last Updated:** 2026-03-30  
> **Version:** 3.0 (PL Genesis Hackathon)

## Executive Summary

Following a comprehensive refactoring initiative based on Core Principles (ENHANCEMENT FIRST, AGGRESSIVE CONSOLIDATION, DRY, CLEAN, MODULAR, PERFORMANT, ORGANIZED), the Agnej codebase has been extended to support the **Protocol Labs / IPFS** persistence layer and **multi-chain infrastructure** (Linea, Flow EVM, Polkadot Hub) for the PL Genesis: Frontiers of Collaboration hackathon.

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Multi-Chain Support | 1 | 3 | +2 |
| Persistence Layers | 1 (DB) | 2 (+IPFS) | +1 |
| Wallet Support | Metamask | +Coinbase Smart Wallet | Improved |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Next.js   │  │   Wagmi     │  │   Socket.io Client      │  │
│  │   (App)     │  │   (Web3)    │  │   (Real-time)           │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
│         │                │                     │                 │
│         ▼                ▼                     ▼                 │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                    Persistence Layer                        │   │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐      │   │
│  │  │      IPFS       │  │      Blockchain (EVM)       │      │   │
│  │  │ (Protocol Labs) │  │  ┌─────────┐  ┌──────────┐  │      │   │
│  │  │ • Replays       │  │  │  Linea  │  │   Flow   │  │      │   │
│  │  │ • Physics Data  │  │  └─────────┘  └──────────┘  │      │   │
│  │  └─────────────────┘  └─────────────────────────────┘      │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Backend Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Node.js    │  │ Socket.io   │  │  Blockchain Service     │  │
│  │  Server     │  │  Server     │  │  (Multi-Provider)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## PL Genesis Enhancements (March 2026)

### 1. Protocol Labs / IPFS Persistence ✅

**Goal:** Decentralized storage for game state history and verifiable replays.

**Implementation:**
- Created `src/lib/ipfs.ts` using public gateways and pinning service abstractions.
- Integrated `captureCollapseState` into `useGameState` to serialize 48-block tower states.
- Automated pinning of tower physics (position, rotation) upon collapse.

**Impact:**
- Every game collapse creates a unique, immutable CID.
- Players can share their "Final Tower" state via IPFS links.
- Foundation for future "Play-to-Earn" or "Verified Physics" bounties.

### 2. Multi-Chain Expansion (Flow & Polkadot) ✅

**Goal:** Expand the "Frontiers of Collaboration" across multiple ecosystems.

**Changes:**
- Refactored `src/config/networks.ts` to include **Flow EVM Testnet** and **Polkadot Hub**.
- Centralized `CONTRACT_ADDRESSES` in `src/config/contracts.ts` using a chain-ID record.
- Added support for **Coinbase Smart Wallet** to lower the barrier for non-Web3 users.

---

## Refactoring Phases Completed

### Phase 3: Configuration Centralization ✅

**Goal:** Single source of truth for all constants

**Changes:**
- Created `src/config/` directory with domain-driven config files:
  - `contracts.ts` - Contract addresses and ABIs
  - `networks.ts` - RPC endpoints and explorers
  - `game.ts` - Physics, tower, camera, timing settings
  - `index.ts` - Centralized exports

**Impact:**
- 78 lines of duplicated code removed
- Type-safe configuration
- Environment-specific overrides simplified

**Usage:**
```typescript
import { CONTRACTS, TOWER_CONFIG, getPhysicsConfig } from '@/config';

// Before
const CONTRACT_ADDRESS = "0x1DFd..."; // Hardcoded in 8 places

// After
const address = CONTRACTS.HOUSE_OF_CARDS.address;
```

---

### Phase 1: State Management ✅

**Goal:** Consolidate scattered React state

**Changes:**
- Created `useGameState` hook replacing ~15 `useState` calls
- Centralized actions: `incrementScore`, `endGame`, `resetGame`, etc.
- Derived values computed automatically

**Impact:**
- 67 lines of code removed from Game.tsx
- Predictable state transitions
- Testable state logic

**Usage:**
```typescript
const {
  state: { score, timeLeft, gameOver, ... },
  actions: { incrementScore, endGame, resetGame, ... },
  isPractice,
  maxPlayers,
} = useGameState(settings, serverState, serverTimeLeft);
```

---

### Phase 2: Physics Engine ✅

**Goal:** Isolate Three.js/Physijs from React components

**Changes:**
- Created `PhysicsEngine` class in `src/lib/physicsEngine.ts`
- Encapsulated scene initialization, tower creation, raycasting
- Event system for physics updates
- State serialization for validation

**Impact:**
- Physics logic testable without browser
- Foundation for server-side validation (Phase 5)
- Clean separation of concerns

**Usage:**
```typescript
const engine = new PhysicsEngine({
  difficulty: 'MEDIUM',
  isSoloCompetitor: false,
  container: htmlElement
});

await engine.initialize();
engine.createTower();
engine.applyImpulse(block, { x: 10, y: 0, z: 0 });
const state = engine.getState(); // For validation
```

---

### Phase 4: Component Consolidation ✅

**Goal:** Simplify GameUI interface, remove prop drilling

**Changes:**
- Rewrote GameUI.tsx with simplified interface
- Accept centralized state object instead of 15+ individual props
- Removed local state duplication

**Impact:**
- **664 lines of code removed**
- Single source of truth for UI state
- Type-safe with centralized state type

**Before:**
```typescript
<GameUI
  gameState={gameStatus}
  potSize={potSize}
  timeLeft={timeLeft}
  fallenCount={fallenCount}
  score={score}
  showRules={showRules}
  setShowRules={setShowRules}
  // ... 12 more props
/>
```

**After:**
```typescript
<GameUI
  state={gameState}
  players={players}
  maxPlayers={maxPlayers}
  difficulty={settings.difficulty}
  // ... 6 more props
/>
```

---

## File Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/game/move/route.ts    # API route for moves
│   ├── play/page.tsx             # Game page
│   └── ...
├── components/
│   ├── Game.tsx                  # Main game component
│   ├── GameUI.tsx                # Game UI (simplified)
│   ├── GameSettings.tsx          # Settings modal
│   ├── Game/
│   │   └── physicsHelpers.ts     # Legacy helpers (deprecated)
│   └── ...
├── hooks/
│   ├── useGameState.ts           # Centralized state (NEW)
│   ├── useGameContract.ts        # Web3 contract interactions
│   ├── useGameSocket.ts          # Real-time multiplayer
│   ├── useLeaderboard.ts         # Leaderboard data
│   └── usePoHVerification.ts     # Proof of Humanity
├── lib/
│   ├── physicsEngine.ts          # Physics engine (NEW)
│   └── shareUtils.ts             # Social sharing
├── config/                       # Centralized config (NEW)
│   ├── index.ts
│   ├── contracts.ts
│   ├── networks.ts
│   └── game.ts
└── abi/                          # Contract ABIs
    ├── HouseOfCardsABI.ts
    └── LeaderboardABI.ts
```

---

## Key Design Decisions

### 1. State Management Pattern

**Decision:** Custom hook (`useGameState`) instead of Redux/Zustand

**Rationale:**
- Sufficient for current complexity
- No additional dependencies
- Easier to understand for new developers
- Can migrate to Zustand later if needed

### 2. Physics Engine Architecture

**Decision:** Class-based wrapper around Three.js/Physijs

**Rationale:**
- Encapsulates complex initialization
- Testable with mocked dependencies
- Foundation for server-side replay

### 3. Configuration Strategy

**Decision:** Static TypeScript config files

**Rationale:**
- Type safety at compile time
- Tree-shaking friendly
- No runtime overhead
- Easy to override per environment

---

## Performance Optimizations

| Optimization | Status | Impact |
|--------------|--------|--------|
| Physics Web Worker | ✅ | Non-blocking UI |
| Centralized State | ✅ | Reduced re-renders |
| Config Tree-shaking | ✅ | Smaller bundle |
| Component Memoization | 🔄 | Pending |
| Lazy Loading | 🔄 | Pending |

---

## Security Considerations

| Concern | Status | Notes |
|---------|--------|-------|
| Client-authoritative physics | ⚠️ | Known issue - Phase 5 planned |
| Input validation | ✅ | Server validates moves |
| Contract reentrancy | ✅ | Uses Checks-Effects-Interactions |
| Front-running | ⚠️ | MEV protection needed |

---

## Future Roadmap

### Phase 5: Server-Side Validation (Planned)
- Submit move history to server
- Replay physics on server to verify score
- Prevent client-side cheating

### Phase 6: Testing Infrastructure
- Unit tests for useGameState
- Physics engine tests with mocked THREE
- E2E tests for game flows

### Phase 7: Performance
- React.memo for UI components
- Lazy load non-critical components
- Optimize physics simulation rate

---

## Development Guidelines

### Adding New Configuration

1. Add to appropriate config file in `src/config/`
2. Export from `src/config/index.ts`
3. Import from `'@/config'` in components

### Adding New Game State

1. Add to `GameState` interface in `useGameState.ts`
2. Add to `useState` in hook
3. Add action to update state
4. Export action from hook return

### Using Physics Engine

```typescript
// New code should use PhysicsEngine directly
import { PhysicsEngine } from '@/lib/physicsEngine';

// Legacy code using physicsHelpers still works
// (marked as @deprecated, will be removed)
```

---

## Metrics

```
Code Quality:
- TypeScript strict mode: ✅
- ESLint: ✅
- Build time: ~12s (unchanged)
- Bundle size: TBD

Maintainability:
- Average file length: ~200 lines (improved)
- Max file length: ~800 lines (Game.tsx, needs more work)
- Test coverage: TBD
- Documentation: This file + inline JSDoc
```

---

## Contributors

- Refactoring initiative: 2026-01
- Core Principles: ENHANCEMENT FIRST, AGGRESSIVE CONSOLIDATION, DRY, CLEAN, MODULAR, PERFORMANT, ORGANIZED

---

*For deployment instructions, see DEPLOYMENT_GUIDE.md*  
*For API documentation, see server/README.md*
