# Agnej 🏗️

A physics-based game with smart contract integration and optional PoH-verified leaderboards. Play solo with no friction, or enable Proof of Humanity to compete fairly on verified leaderboards. Join multiplayer battles with minimal blockchain interaction for efficient gameplay and lower gas costs.

**Built with:** Next.js, Three.js, Physijs, Solidity (Linea Sepolia), Socket.io, Cannon.js

**Contracts:**
- Game Contract: [0x1DFd9003590E4A67594748Ecec18451e6cBDDD90](https://sepolia.lineascan.build/address/0x1DFd9003590E4A67594748Ecec18451e6cBDDD90)
- Leaderboard: [0x3127Ebc72F9760728cc2032DC28Ed7D2250bC9cF](https://sepolia.lineascan.build/address/0x3127Ebc72F9760728cc2032DC28Ed7D2250bC9cF)

## 🎮 Game Modes

### Solo Practice
- Practice physics and controls without pressure
- No timer, no restrictions, no gates
- Perfect for learning the game

### Solo Competitor ⭐ 
- **Race against time** - 30 seconds to remove each block
- **Top 2 layers locked** - Can't touch them!
- **Collapse = Game Over** - If locked layers fall below Y=12
- **On-Chain Leaderboard** - Submit scores to blockchain (no PoH required)
- **Verified Leaderboard (Optional)** - Enable PoH to compete fairly on verified ranks
- **Rankings & Competition** - See your rank vs global players (all or verified-only)

### Multiplayer ⭐ LIVE
- 7-player turn-based battles (only product in exponent with this)
- **Scalable Architecture** - Supports infinite concurrent game lobbies
- **Lobby Browser** - Browse and join active games
- **Secure Play** - Cryptographic handshake & Pay-to-Play enforcement
- Real-time physics synchronization (Optimized for Mobile)
- Smart contract pot distribution (7 ETH = 80% to winner)
- Referral system - Share game links for 5% bonus
- Invite friends to exponential growth

## 🚀 Quick Start

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Development (Terminal 1)
npm run dev          # Frontend on :3000

# Development (Terminal 2)
cd server && npm run dev  # Backend on :3001
```

Open [http://localhost:3000](http://localhost:3000)

### Testing Multiplayer Locally

See **[MULTIPLAYER_STABILIZATION.md](docs/MULTIPLAYER_STABILIZATION.md#-testing-checklist)** for detailed testing procedures and Hetzner deployment instructions.

## 📚 Documentation

Comprehensive documentation consolidated into core guides:

1. **[Architecture Overview](docs/ARCHITECTURE.md)** - System architecture, refactoring phases, design decisions ⭐ **UPDATED 2026-01**
2. **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Smart contract deployment, server setup, frontend configuration, and testing
3. **[Game Mechanics](docs/GAME_MECHANICS.md)** - Game rules, tower structure, gameplay loops, and mobile features
4. **[Architecture Overview (Legacy)](docs/ARCHITECTURE_OVERVIEW.md)** - Original system design (see new ARCHITECTURE.md)
5. **[Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)** - Component integration, deployment checklist, and code examples

## ✨ Key Features

### Solo Mode (Open & Gate-Free)
- ✅ **Physics-based 3D gameplay** with Physijs (120 FPS)
- ✅ **Difficulty levels** (EASY/MEDIUM/HARD) affecting friction & mass
- ✅ **On-chain leaderboard** with rankings (everyone can play)
- ✅ **Real-time scoring** - Each block removed adds to score
- ✅ **Competition stats** - Your rank, total players, top 3 preview
- ✅ **New high score celebrations** with animated UI
- ✅ **Verified Leaderboard (Opt-in)** - PoH verification prevents bot manipulation

### Multiplayer Features (Implemented)
- ✅ **7-player turn-based gameplay** with 30-second turns
- ✅ **Scalable Server** - GameManager architecture supports multiple concurrent lobbies
- ✅ **Server-authoritative physics** using Cannon.js (60Hz sim, 20Hz broadcast)
- ✅ **Secure Authentication** - Wallet signature handshake prevents spoofing
- ✅ **Pay-to-Play Enforcement** - Server verifies on-chain payment before entry
- ✅ **Real-time synchronization** via Socket.io
- ✅ **Web3 integration** (RainbowKit + wagmi + Viem)
- ✅ **Minimal blockchain oracle** - Only final game states recorded on-chain
- ✅ **Referral system** - Share game links for 5% bonus (viral growth)
- ✅ **Proof of Humanity integration** - Fair verification for multiplayer

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, Three.js, Physijs, TailwindCSS |
| **Physics** | Physijs (client), Cannon.js (server), PhysicsEngine class |
| **State** | Custom hooks (useGameState), centralized config |
| **Backend** | Express.js, Socket.io, Ethers.js |
| **Blockchain** | Solidity 0.8.19, Linea Sepolia |
| **Web3** | RainbowKit, wagmi, Viem |

## 🌐 Network Details

- **Network:** Linea Sepolia Testnet
- **Game Contract:** `0x1DFd9003590E4A67594748Ecec18451e6cBDDD90`
- **Leaderboard:** `0x3127Ebc72F9760728cc2032DC28Ed7D2250bC9cF`
- **RPC:** `https://rpc.sepolia.linea.build`
- **Entry Stake:** 0.001 ETH (Multiplayer)

## 📁 Project Structure

```
agnej/
├── src/
│   ├── app/             # Next.js App Router
│   ├── components/      # React components
│   │   ├── Game/        # Game physics helpers
│   │   ├── Game.tsx     # Main game component
│   │   ├── GameUI.tsx   # HUD overlay (simplified)
│   │   └── GameSettings.tsx
│   ├── hooks/           # Custom React hooks
│   │   ├── useGameState.ts      # ⭐ Centralized state (NEW)
│   │   ├── useGameContract.ts
│   │   ├── useGameSocket.ts
│   │   └── useLeaderboard.ts
│   ├── lib/             # Utility libraries
│   │   ├── physicsEngine.ts     # ⭐ Physics engine (NEW)
│   │   └── shareUtils.ts
│   ├── config/          # ⭐ Centralized config (NEW)
│   │   ├── index.ts
│   │   ├── contracts.ts
│   │   ├── networks.ts
│   │   └── game.ts
│   └── abi/             # Smart contract ABIs
├── server/              # Express + Socket.io backend
├── contracts/           # Solidity smart contracts
│   ├── HouseOfCards.sol
│   └── Leaderboard.sol
├── docs/                # Technical documentation
└── public/
    └── js/              # Physijs workers
```

## 🎯 Development Status

### ✅ Completed (Phase 1 + Linea Recommendations)
- ✅ **Open Gameplay Architecture** - Core gameplay completely gate-free, PoH opt-in only on leaderboards
- ✅ **Proof of Humanity Leaderboard** - Linea PoH V2 API integration strategy, dual leaderboard views
- ✅ **Multiplayer Growth Strategy** - Referral system (5% bonus), invite mechanics, viral loops
- ✅ **Solo Competitor Mode** - Full implementation with leaderboard
- ✅ **On-chain scoring** - Submit & retrieve scores from blockchain
- ✅ **Dynamic difficulty** - Physics adjusts based on difficulty setting
- ✅ **Enhanced game over screen** - Rank, stats, top players preview
- ✅ **Transaction feedback** - Links to Lineascan, clear states
- ✅ **Physics restart bug fixes** - Clean scene management & worker lifecycle
- ✅ **Core 3D physics** - 16-layer tower with realistic block physics
- ✅ **Web3 wallet integration** - RainbowKit with Linea Sepolia
- ✅ **Touch controls** - Mobile-friendly drag & release
- ✅ **Game state management** - Multiple mode support
- ✅ **Multiplayer Scaling** - Architecture supports multiple concurrent games & auto-cleanup
- ✅ **Network Optimization** - Delta compression & broadcast throttling for mobile

### 🚧 In Progress
- ⚠️ Linea PoH V2 contract deployment
- ⚠️ Spectator mode with betting

### ✅ Completed: Codebase Refactoring (Jan 2026)
Following Core Principles: ENHANCEMENT FIRST, AGGRESSIVE CONSOLIDATION, DRY, CLEAN, MODULAR

| Phase | Description | Impact |
|-------|-------------|--------|
| **Phase 3** | Configuration Centralization | 4 config files, -78 lines |
| **Phase 1** | State Management (useGameState) | -67 lines, testable |
| **Phase 2** | Physics Engine Module | +510 lines, reusable |
| **Phase 4** | Component Consolidation | **-664 lines** |
| **Total** | 18 files changed | **+1,372/-811 lines** |

**Key Improvements:**
- ✅ Centralized configuration (`src/config/`)
- ✅ Unified game state (`useGameState` hook)
- ✅ Modular physics engine (`PhysicsEngine` class)
- ✅ Simplified GameUI interface (11 props vs 18)
- ✅ Type-safe throughout

### 📋 Planned (Phase 2 Features)
- [ ] Deploy PoH-enabled contracts
- [ ] Implement Linea PoH V2 verification flow
- [ ] Dedicated leaderboard page (`/leaderboard`) with PoH filtering
- [ ] Global top 10/25/50 displays
- [ ] Multiplayer invite system & social sharing
- [ ] Historical score trends

### 🔮 Planned (Phase 5)
- [ ] Server-side score validation (anti-cheat)
- [ ] Move history replay for verification
- [ ] Physics state serialization

## 🐛 Recent Fixes

### Major Refactoring (Jan 2026)
- ✅ **Configuration Centralization** - Single source of truth in `src/config/`
- ✅ **State Management** - `useGameState` hook consolidates 15+ useState calls
- ✅ **Physics Engine** - Modular `PhysicsEngine` class, testable, reusable
- ✅ **Component Consolidation** - Simplified GameUI, -664 lines
- ✅ **CORS Fix** - RPC endpoints configured to prevent blank page issues
- ✅ **SOLO_COMPETITOR Timer** - Working 30-second countdown

### Physics & Lifecycle
- ✅ Fixed game restart physics stall issue
- ✅ Proper Physijs worker management
- ✅ Event listener cleanup on component unmount
- ✅ Timeout and animation frame cleanup

### Leaderboard Integration
- ✅ Fixed hardcoded MEDIUM difficulty bug
- ✅ Dynamic difficulty now works for EASY/MEDIUM/HARD
- ✅ Auto-refetch after score submission
- ✅ Added rank calculation and total players count
- ✅ Top scores retrieval with sorting

### UI/UX
- ✅ New high score celebration with animations
- ✅ Rank and competition stats display
- ✅ Top 3 players preview on game over
- ✅ Transaction hash links to block explorer
- ✅ Better loading states with emojis
- ✅ Responsive modal design

## 🤝 Contributing

We welcome contributions! Areas of focus:
1. Performance optimization for physics engine
2. Leaderboard page UI/UX
3. Multiplayer scaling (multiple concurrent games)
4. Mobile performance optimization

## 📄 License

MIT

---

**Play Now:** [localhost:3000](http://localhost:3000) (after running `npm run dev`)

**View on Lineascan:**
- [Game Contract](https://sepolia.lineascan.build/address/0x1DFd9003590E4A67594748Ecec18451e6cBDDD90)
- [Leaderboard Contract](https://sepolia.lineascan.build/address/0x3127Ebc72F9760728cc2032DC28Ed7D2250bC9cF)

*Last Updated: 2025-12-04 - Updated with Linea team feedback on PoH verification and multiplayer growth*
