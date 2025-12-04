# Agnej 🏗️

A decentralized blockchain-based physics game with open core gameplay and optional PoH-verified leaderboards. Play solo with no friction, or enable Proof of Humanity to compete fairly on verified leaderboards. Join multiplayer battles for higher rewards and exponential growth through referral mechanics.

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

### Multiplayer ⭐ COMING SOON - The Differentiator
- 7-player turn-based battles (only product in exponent with this)
- Real-time physics synchronization
- Smart contract pot distribution (7 ETH = 80% to winner)
- Referral system - Share game links for 5% bonus
- Invite friends to exponential growth

## 🚀 Quick Start

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Development
npm run dev          # Frontend on :3000
cd server && npm run dev  # Backend on :3001
```

Open [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

Comprehensive documentation consolidated into 4 core guides:

1. **[Setup & Architecture](docs/SETUP_AND_ARCHITECTURE.md)** - System design, physics engine, smart contracts, and PoH integration setup
2. **[Game Mechanics](docs/GAME_MECHANICS.md)** - Game rules, tower structure, gameplay loops, and mobile features
3. **[Implementation Guide](docs/IMPLEMENTATION_GUIDE.md)** - Component integration, deployment checklist, and code examples
4. **[Roadmap & Strategy](docs/ROADMAP_AND_STRATEGY.md)** - Product vision, growth mechanics, implementation timeline, and success metrics

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
- ✅ **Server-authoritative physics** using Cannon.js
- ✅ **Real-time synchronization** via Socket.io (60 FPS)
- ✅ **Web3 integration** (RainbowKit + wagmi + Viem)
- ✅ **Smart contract oracle** for state management
- ✅ **Referral system** - Share game links for 5% bonus (viral growth)
- ✅ **Proof of Humanity integration** - Fair verification for multiplayer

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, Three.js, Physijs, TailwindCSS |
| **Physics** | Physijs (client), Cannon.js (server) |
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
│   ├── components/      # React components
│   │   ├── Game/        # Modular game logic
│   │   ├── Game.tsx     # Main game component
│   │   ├── GameUI.tsx   # HUD overlay
│   │   └── GameSettings.tsx
│   ├── hooks/           # Custom React hooks
│   │   ├── useGameContract.ts
│   │   ├── useGameSocket.ts
│   │   └── useLeaderboard.ts  # ⭐ NEW
│   └── abi/             # Smart contract ABIs
├── server/              # Express + Socket.io backend
├── contracts/           # Solidity smart contracts
│   ├── HouseOfCards.sol
│   └── Leaderboard.sol  # ⭐ NEW
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
- ✅ **Multiplayer differentiator** - Only product in exponent with 7-player multiplayer

### 🚧 In Progress
- ⚠️ Multiplayer server stabilization
- ⚠️ Oracle integration (partial)
- ⚠️ Linea PoH V2 contract deployment

### 📋 Planned (Phase 2)
- [ ] Deploy PoH-enabled contracts
- [ ] Implement Linea PoH V2 verification flow
- [ ] Dedicated leaderboard page (`/leaderboard`) with PoH filtering
- [ ] Global top 10/25/50 displays
- [ ] Multiplayer invite system & social sharing
- [ ] Historical score trends
- [ ] Social features (share scores, challenges)
- [ ] Multiple concurrent multiplayer games
- [ ] Spectator mode with betting

## 🐛 Recent Fixes

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
1. Gas optimization for leaderboard contract
2. Leaderboard page UI/UX
3. Multiplayer testing and bug fixes
4. Mobile performance optimization

## 📄 License

MIT

---

**Play Now:** [localhost:3000](http://localhost:3000) (after running `npm run dev`)

**View on Lineascan:**
- [Game Contract](https://sepolia.lineascan.build/address/0x1DFd9003590E4A67594748Ecec18451e6cBDDD90)
- [Leaderboard Contract](https://sepolia.lineascan.build/address/0x3127Ebc72F9760728cc2032DC28Ed7D2250bC9cF)

*Last Updated: 2025-12-04 - Updated with Linea team feedback on PoH verification and multiplayer growth*
