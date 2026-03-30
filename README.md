# Agnej 🏗️

A physics-based game with smart contract integration and decentralised collaboration. Play solo, or enable Proof of Humanity to compete fairly on verified leaderboards. Join multiplayer battles with minimal blockchain interaction for efficient gameplay and lower gas costs.

**🏆 PL Genesis: Frontiers of Collaboration (2026) Candidate**
Agnej is built for the **Existing Code** track, showcasing decentralized coordination, multi-chain infrastructure, and verifiable game replays.

**Built with:** Next.js, Three.js, Physijs, Solidity (Multi-chain), Socket.io, IPFS/Protocol Labs

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
- **Verifiable Replays** - Game state automatically persisted to **IPFS** on collapse
- **Rankings & Competition** - See your rank vs global players (all or verified-only)

### Multiplayer ⭐ LIVE
- 7-player turn-based battles (Frontiers of Collaboration)
- **Multi-Chain Support** - Play on **Linea**, **Flow EVM**, or **Polkadot Hub**
- **Scalable Architecture** - Supports infinite concurrent game lobbies
- **Secure Play** - Coinbase Smart Wallet support + Cryptographic handshake
- Real-time physics synchronization (Optimized for Mobile)
- Smart contract pot distribution (80% to winner)

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

## 📚 Documentation

Comprehensive documentation consolidated into core guides:

1. **[Architecture Overview](docs/ARCHITECTURE.md)** - System architecture, refactoring phases, design decisions ⭐ **UPDATED 2026-03**
2. **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Multi-chain deployment (Linea, Flow, Polkadot)
3. **[Game Mechanics](docs/GAME_MECHANICS.md)** - Game rules, tower structure, gameplay loops, and mobile features
4. **[Polkadot Hackathon Plan](docs/POLKADOT_HACKATHON.md)** - Specific implementation for Polkadot Hub

## ✨ Key Features

### Decentralized Persistence (Protocol Labs)
- ✅ **Verifiable Game State** - Tower collapse states are serialized and pinned to **IPFS**.
- ✅ **Immutable Replays** - Players receive a CID (Content Identifier) to view their tower's final state.
- ✅ **Open Data** - Physics data is stored on-chain (Score) and off-chain (IPFS) for transparency.

### Multi-Chain Infrastructure
- ✅ **Linea Sepolia** - Primary testnet with PoH integration.
- ✅ **Flow EVM** - High-throughput gaming experience with FLOW tokens.
- ✅ **Polkadot Hub** - Cross-chain coordination primitives and DOT staking.
- ✅ **Coinbase Wallet** - Simplified onboarding via **OnchainKit** and Smart Wallet.

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, Three.js, Physijs, TailwindCSS |
| **Physics** | Physijs (client), Cannon.js (server), PhysicsEngine class |
| **Persistence** | **IPFS / Protocol Labs** (Game history) |
| **Blockchain** | Solidity 0.8.20+, Linea, Flow EVM, Polkadot Hub |
| **Web3** | RainbowKit, wagmi, Viem, **Coinbase OnchainKit** |

## 🌐 Network Details

| Network | Chain ID | Native Token | RPC Endpoint |
|---------|----------|--------------|--------------|
| **Linea Sepolia** | 59141 | ETH | `rpc.sepolia.linea.build` |
| **Flow EVM Testnet** | 545 | FLOW | `testnet.evm.nodes.onflow.org` |
| **Polkadot Hub Testnet** | 420420417 | DOT | `rpc.polkadot.io/testnet` |

## 🎯 Development Status

### ✅ Completed: PL Genesis Enhancements (March 2026)
Following Core Principles: ENHANCEMENT FIRST, AGGRESSIVE CONSOLIDATION

| Feature | Description | Impact |
|-------|-------------|--------|
| **IPFS Persistence** | Game history pinned to IPFS | Verifiable game states |
| **Flow EVM Support** | Added Flow EVM Testnet | Expanded player reach |
| **Coinbase Wallet** | Smart Wallet integration | Frictionless onboarding |
| **Multi-chain Config** | Centralized contract mapping | Easy chain expansion |

### ✅ Completed: Codebase Refactoring (Jan 2026)
Following Core Principles: ENHANCEMENT FIRST, AGGRESSIVE CONSOLIDATION, DRY, CLEAN, MODULAR

| Phase | Description | Impact |
|-------|-------------|--------|
| **Phase 3** | Configuration Centralization | 4 config files, -78 lines |
| **Phase 1** | State Management (useGameState) | -67 lines, testable |
| **Phase 2** | Physics Engine Module | +510 lines, reusable |
| **Phase 4** | Component Consolidation | **-664 lines** |

## 🤝 Contributing

We welcome contributions! Areas of focus:
1. XCM Cross-chain leaderboards for Polkadot
2. AI-driven move validation on IPFS
3. Mobile performance optimization

## 📄 License

MIT

---

**Last Updated:** 2026-03-30 - PL Genesis Hackathon Final Polish
