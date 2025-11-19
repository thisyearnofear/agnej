# House of Cards

A decentralized multiplayer physics-based block tower game. Players take turns removing blocks from a 16-layer wooden tower. The player who causes collapse is eliminated. Last survivor wins the pot.

**Built with:** Next.js, Three.js, Solidity (Linea Sepolia), Socket.io, Cannon.js

**Status:** MVP on testnet ([0x1DFd9003590E4A67594748Ecec18451e6cBDDD90](https://sepolia.lineascan.build/address/0x1DFd9003590E4A67594748Ecec18451e6cBDDD90))

## Quick Start

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Development
npm run dev          # Frontend on :3000
cd server && npm run dev  # Backend on :3001
```

Open [http://localhost:3000](http://localhost:3000)

## Documentation

- **[Game Mechanics](docs/GAME_MECHANICS.md)** - Tower structure, gameplay loop, smart contract details
- **[Architecture](docs/ARCHITECTURE.md)** - System design, physics synchronization, oracle integration
- **[Setup & Development](docs/SETUP.md)** - Installation, development, production build, contract deployment
- **[Roadmap](docs/ROADMAP.md)** - Product vision, phases 1-4, risk mitigation, timeline

## Key Features

- **7-player turn-based gameplay** with 30-second turns
- **Server-authoritative physics** using Cannon.js
- **Real-time synchronization** via Socket.io (60 FPS)
- **Web3 integration** (RainbowKit + wagmi + Viem)
- **Smart contract oracle** for collapse detection & pot distribution
- **Reload system** - eliminated players can rejoin (max 2 reloads per game)

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js, React 19, Three.js, Physijs, TailwindCSS |
| Backend | Express.js, Socket.io, Cannon.js, Ethers.js |
| Blockchain | Solidity 0.8.19, OpenZeppelin, Linea Sepolia testnet |

## Network Details

- **Network:** Linea Sepolia
- **Contract:** `0x1DFd9003590E4A67594748Ecec18451e6cBDDD90`
- **RPC:** `https://rpc.sepolia.linea.build`
- **Entry Stake:** 0.001 ETH
- **Max Players:** 7

## Project Structure

```
houseofcards/
├── src/           # Next.js frontend
├── server/        # Express + Socket.io backend
├── contracts/     # Solidity smart contracts
├── docs/          # Technical documentation
└── public/        # Static assets
```

## Development Notes

### Current Status
- ✅ Core gameplay mechanics
- ✅ Physics simulation & 3D rendering
- ✅ Socket.io synchronization
- ✅ Web3 wallet integration
- ✅ Smart contract deployed on Linea Sepolia
- ⚠️ Oracle functions partially implemented

### Known Limitations
- In-memory game state (not persisted)
- Single game instance at a time
- No client-side prediction
- Collapse detection based on fallen block count only

See [SETUP.md](docs/SETUP.md) for MVP gaps and future enhancements.

## License

MIT
