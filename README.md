# Agnej 🏗️ — The Physics of Social Coordination

**Agnej** is a decentralized 3D physics-based coordination game built for the **PL Genesis: Frontiers of Collaboration** hackathon. 

In Agnej, players collaborate (or compete) to remove blocks from a high-fidelity 3D tower. It serves as a literal and digital metaphor for the "Frontiers of Collaboration"—where the actions of one individual can impact the stability of the entire collective system.

---

## 🏆 Hackathon Submission: PL Genesis 2026
*   **Track:** [Existing Code Track]($50,000 Prize Pool)
*   **Submission Link:** [DevSpot Portal](https://pl-genesis-frontiers-of-collaboration-hackathon.devspot.app/)
*   **Vision:** To create a "Universal Coordination Layer" where physics-based social interactions are verifiable on-chain and persisted permanently via decentralized storage.

### 🚀 Work Completed During Hackathon (Feb 10 – Mar 31)
| Feature | Technology | Impact |
|---------|------------|--------|
| **Verifiable Physics Replays** | **IPFS / Protocol Labs** | Captures and pins 48-block tower states upon collapse for immutable history. |
| **Multi-Chain Expansion** | **Flow EVM** | Full deployment to Flow Testnet for high-throughput, low-latency coordination. |
| **Cross-Chain Coordination** | **Polkadot Hub** | Integrated Polkadot Hub Testnet for future XCM-based leaderboard aggregation. |
| **Frictionless Onboarding** | **Coinbase Smart Wallet** | Integrated OnchainKit to remove gas hurdles for new "collaborators". |
| **Chain-Agnostic UI** | **Next.js / Wagmi** | Dynamic currency detection (FLOW/DOT/ETH) and contract resolution. |

---

## 🌌 Frontiers of Collaboration

Agnej represents the frontier where game theory meets physical reality. 

1.  **Shared Stability:** Every block removed increases the "Pot," but also increases the risk of collapse. This mirrors decentralized governance—where individual gain must be balanced against systemic health.
2.  **Verifiable Truth (Protocol Labs):** By persisting tower states to **IPFS**, we move beyond "trust me" gaming. Every collapse is a permanent, verifiable CID that can be audited by any participant.
3.  **Cross-Ecosystem Onboarding (Coinbase):** By using **OnchainKit**, we welcome users from the Coinbase ecosystem into the "Frontiers" with zero-friction onboarding.

---

## 🎮 Game Modes

### Solo Practice
- Master the physics without the stakes. No timer, no restrictions.

### Solo Competitor ⭐ 
- **Time-Trial Coordination:** 30 seconds per block.
- **Verifiable Persistence:** Every collapse is pinned to **IPFS** automatically.
- **On-Chain Leaderboard:** Submit high scores to **Linea**, **Flow**, or **Polkadot**.

### Multiplayer ⭐ LIVE
- **7-Player Coordination:** A true test of "Frontiers of Collaboration."
- **High-Stakes:** Split the pot among survivors—or lose everything if you're the one who triggers the collapse.
- **Scalable Architecture:** Real-time physics synchronization across multiple chains.

---

## 🛠️ Tech Stack & Bounties

| Sponsor / Tech | Integration Details | Bounty Track |
|----------------|---------------------|--------------|
| **Protocol Labs / IPFS** | `src/lib/ipfs.ts` - Pins game state JSON to IPFS on collapse. | Open Data / Persistence |
| **Flow EVM** | `0xd21F62a37C2A72d0993dE6273Cb2eb830e53Fcd4` - Live on Flow Testnet. | $10,000 Flow Challenge |
| **Coinbase / CDP** | **OnchainKit** integration for Smart Wallet support. | Consumer dApps |
| **Polkadot Hub** | Refactored multi-chain config for DOT/PAS support. | Polkadot EVM Track |
| **Linea** | **Proof of Humanity (PoH)** V2 integration for sybil-resistance. | Human-centric dApps |

---

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

---

## 📚 Documentation

1.  **[Architecture Overview](docs/ARCHITECTURE.md)** - System design 3.0 (IPFS & Multi-chain)
2.  **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Multi-chain deployment steps (Flow/Linea/Polkadot)
3.  **[Game Mechanics](docs/GAME_MECHANICS.md)** - Detailed rules and IPFS serialization logic
4.  **[Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)** - Detailed list of hackathon achievements

## 📄 License
MIT

**Built for the future of decentralized collaboration.**
