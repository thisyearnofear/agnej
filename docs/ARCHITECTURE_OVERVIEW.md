# Architecture Overview

This document provides an overview of the system architecture, setup, and key components of Agnej.

## Table of Contents
- [System Architecture](#system-architecture)
- [Physics System](#physics-system)
- [Smart Contracts](#smart-contracts)
- [File Structure](#file-structure)
- [Proof of Humanity Integration](#proof-of-humanity-integration)
- [Multiplayer and Invite System](#multiplayer-and-invite-system)
- [Performance Notes](#performance-notes)
- [Tech Stack](#tech-stack)

## System Architecture

### High-Level Overview

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
           │ (game start/end only)
┌──────────▼──────────┐
│ Smart Contract      │
│ (Linea Sepolia)     │
└─────────────────────┘
```

### Mode Architectures

**Solo Mode** - Client-side only:
- No server dependency
- Three.js + Physijs physics (120 FPS)
- Direct blockchain interaction (score submission only)

**Multiplayer Mode** - Server-authoritative:
- Socket.io WebSocket for real-time sync
- Cannon.js physics (60 FPS server, 60 FPS client rendering)
- Full game state broadcast every frame

## Physics System

### Server Physics (Cannon.js - Authoritative)
- **Update rate**: 60 FPS (16.67ms per step)
- **Gravity**: -30 m/s²
- **Block mass**: 1 unit
- **Block friction**: 0.4
- **Block restitution**: 0.4 (bounciness)
- **Damping**: 0.05 (linear & angular)
- **Collapse detection**: Block falls below y < 0.5

### Client Physics (Physijs/Three.js)
- Mirrors server state for visual representation
- Touch/drag input applies force
- Force magnitude: dragDistance × 10
- Latency: ~50-200ms

### Synchronization Flow

1. Player drags block on client
2. Client sends `submitMove` with force vector
3. Server applies force in physics simulation
4. Server broadcasts new block states
5. Clients render server state
6. Loop repeats 60 times per second

**Blockchain Integration**:
- Game start: Player stakes are recorded on-chain (joinGame)
- Game end: Only collapse events are recorded on-chain (reportCollapse)
- No per-turn blockchain interactions for MVP efficiency
- Server-authoritative gameplay with minimal blockchain interaction

**Key principle**: Server is authoritative, all physics truth lives on server.

## Smart Contracts

### Leaderboard Contract (Solo)
**Address**: `0x3127Ebc72F9760728cc2032DC28Ed7D2250bC9cF` (Linea Sepolia)

Functions:
- `submitScore(difficulty, score)` - Write
- `getHighScore(player, difficulty)` - Read
- `getPlayerRank(player, difficulty)` - Read
- `getTopScores(difficulty, count)` - Read
- `getTotalPlayers(difficulty)` - Read
- `verifyPoHSigned(bytes signature)` - PoH verification
- `verifyPoHOffchain(address player)` - Oracle verification

### HouseOfCards Contract (Multiplayer)
**Address**: `0x1DFd9003590E4A67594748Ecec18451e6cBDDD90` (Linea Sepolia)

Constants:
- MAX_PLAYERS: 7
- ENTRY_STAKE: 0.001 ETH
- TURN_DURATION: 30 seconds
- COLLAPSE_THRESHOLD: 40%

## File Structure

```
src/
├── app/             # Routes & pages
├── components/
│   ├── Game.tsx                    # Main 3D game
│   ├── GameUI.tsx                  # HUD overlay
│   ├── GameSettings.tsx            # Mode selection
│   ├── PoHVerification.tsx         # PoH component
│   └── GameShareModal.tsx          # Share modal
├── hooks/
│   ├── useGameContract.ts          # Multiplayer contract
│   ├── useGameSocket.ts            # Socket.io sync
│   ├── useLeaderboard.ts           # Solo leaderboard
│   └── usePoHVerification.ts       # PoH verification
├── lib/
│   ├── shareUtils.ts               # Social sharing
│   └── inviteLinks.ts              # Referral generation
└── abi/
    ├── HouseOfCardsABI.ts          # Multiplayer ABI
    └── LeaderboardABI.ts           # Solo ABI
```

## Proof of Humanity Integration

### Architecture Decision
- **Core gameplay** (Solo Practice, Solo Competitor) = completely open
- **Leaderboard rankings** = opt-in PoH verification
- **Dual leaderboard views** = All scores + Verified-only

### Implementation
- **Linea PoH V2 API**: `https://poh-api.linea.build/poh/v2/{address}`
- **Sumsub Flow**: Message signing + iframe integration
- **Smart Contract**: `verifyPoHSigned()` for production verification
- **Frontend**: `<PoHVerification />` component for UI

Benefits:
- Attracts wide audience (no friction to try)
- Prevents bot manipulation (verified leaderboard only)
- Fair competition (real players compete)
- Network effect (users naturally progress to verification)

## Multiplayer and Invite System

### Turn Flow

1. Player joins and stakes 0.001 ETH
2. Game starts when 2+ players join
3. Each player gets 30-second turn
4. Current player removes block from tower
5. On timeout/collapse, next player or game ends
6. Survivors split pot equally

### Referral System
- Invite links: `agnej.app/play?ref=0x123...`
- Bonus: 5% score multiplier or pot share
- On-chain tracking: Transparent and verifiable
- Viral growth mechanic

### Social Sharing
- Multi-platform: Twitter, Farcaster, Discord, Telegram
- Pre-formatted messages per game type
- Clipboard copy for all messages
- Referral links embedded

## Performance Notes

- **Physics**: 60 FPS server, 60 FPS client target
- **Network**: Full state broadcast every frame
- **Blockchain**: Minimal interaction - only game start/end (~2 tx per game vs ~50+ per game previously)
- **Scalability**: Currently single game instance (queue system planned)
- **Gas optimization**: Removed per-turn blockchain calls, reducing gas costs by ~95%

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Three.js, Physijs
- **Backend**: Express, Node.js, Socket.io, Cannon.js
- **Blockchain**: Solidity, Linea Sepolia, Viem, RainbowKit
- **Database**: In-memory (PostgreSQL/Firestore planned)
