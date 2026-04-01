# Agnej Deployment Guide

> **Last Updated:** 2026-03-30  
> **Version:** 3.0 (PL Genesis Hackathon)

This guide covers the deployment of Agnej across multiple chains (Linea, Flow EVM, Polkadot Hub) and the Protocol Labs / IPFS persistence layer.

---

## 1. Smart Contract Deployment

Agnej uses the same Solidity source code for all supported chains.

### 1a. Linea Sepolia (Primary)
```bash
# Compile and deploy via Hardhat
npx hardhat run scripts/deploy.ts --network linea
```

### 1b. Flow EVM Testnet ✅ (DEPLOYED)
- **Leaderboard:** `0x5758c5551FFAabbAD966B2d6C26dc9E21137D681`
- **HouseOfCards:** `0xd21F62a37C2A72d0993dE6273Cb2eb830e53Fcd4`

**Deployment via Forge (Recommended):**
Foundry's `forge` is significantly faster and more reliable for multi-chain deployments.
```bash
# Leaderboard
forge create contracts/Leaderboard.sol:Leaderboard --rpc-url https://testnet.evm.nodes.onflow.org --private-key $PRIVATE_KEY --broadcast

# HouseOfCards
forge create contracts/HouseOfCards.sol:HouseOfCards --rpc-url https://testnet.evm.nodes.onflow.org --private-key $PRIVATE_KEY --broadcast
```

### 1c. Polkadot Hub Testnet
Polkadot Hub uses the `resolc` compiler for PolkaVM optimization.
```bash
# Use the Polkadot Hardhat plugin
npx hardhat compile --compiler resolc
npx hardhat run scripts/deploy.ts --network polkadot
```

---

## 2. Frontend Configuration (Multi-Chain Agnostic)

Agnej has been refactored to be completely chain-agnostic. To add a new chain:

1.  **Define Chain:** Add the chain to `src/config/networks.ts` using Viem's `defineChain`.
2.  **Add RPC/Explorer:** Update `RPC_ENDPOINTS` and `EXPLORER_URLS` in the same file.
3.  **Register Contracts:** Add the deployed addresses to the `CONTRACT_ADDRESSES` mapping in `src/config/contracts.ts`.
4.  **Currency Logic:** The UI automatically detects the native currency (ETH, FLOW, DOT) via the `getChainCurrency` helper.

### 2a. IPFS Configuration
Agnej uses `src/lib/ipfs.ts` for decentralized persistence.
...

---

## 3. Server Deployment (Multi-Provider)

The Agnej server must be configured to handle multiplayer games on different chains.

```env
# server/.env
LINEA_RPC_URL=...
FLOW_RPC_URL=https://testnet.evm.nodes.onflow.org
POLKADOT_RPC_URL=https://rpc.polkadot.io/testnet
```

The server automatically selects the correct provider based on the `chainId` provided in the client's handshake.

---

## 4. Testing Checklist

- [ ] **IPFS:** Trigger tower collapse in Solo mode, verify CID is generated and accessible on `ipfs.io`.
- [ ] **Flow:** Connect via Coinbase Wallet on Flow EVM, verify balance displays correctly.
- [ ] **Polkadot:** Verify score submission to Polkadot Hub Leaderboard.
- [ ] **Multi-chain:** Switch between chains in RainbowKit without page refresh.
