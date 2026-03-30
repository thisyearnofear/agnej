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

### 1b. Flow EVM Testnet
Flow EVM is fully compatible with standard EVM tools.
```bash
# Add Flow network to hardhat.config.ts
# Chain ID: 545
# RPC: https://testnet.evm.nodes.onflow.org
npx hardhat run scripts/deploy.ts --network flow
```

### 1c. Polkadot Hub Testnet
Polkadot Hub uses the `resolc` compiler for PolkaVM optimization.
```bash
# Use the Polkadot Hardhat plugin
npx hardhat compile --compiler resolc
npx hardhat run scripts/deploy.ts --network polkadot
```

---

## 2. Frontend Configuration (IPFS & Multi-chain)

### 2a. IPFS Configuration
Agnej uses `src/lib/ipfs.ts` for decentralized persistence.
- **Development:** Uses public IPFS gateways (ipfs.io).
- **Production:** Recommended to add a Pinata or Web3.Storage API key to `.env`.

```env
# .env
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io/ipfs/
# Optional: Pinata/Web3.Storage keys
```

### 2b. Multi-chain Configuration
Update `src/config/contracts.ts` with your newly deployed addresses:

```typescript
const CONTRACT_ADDRESSES = {
  HOUSE_OF_CARDS: {
    [lineaId]: '0x...',
    [flowId]: '0x...',
    [polkadotId]: '0x...',
  },
  // ...
}
```

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
