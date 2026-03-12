# Polkadot Solidity Hackathon — Implementation Plan

> **Hackathon:** [Polkadot Solidity Hackathon 2026](https://polkadothackathon.com/)
> **Track:** EVM Smart Contract — DeFi / Consumer dApps
> **Timeline:** Hacking Mar 1–20, Demo Day Mar 24–25
> **Prize Pool:** $30K ($15K for EVM track)

---

## TL;DR — Can We Leverage Existing Linea Contracts?

**Yes and no.** The Solidity _source code_ is fully reusable — Polkadot Hub supports Solidity 0.8.x via the `resolc` compiler. However, existing _deployed_ contracts on Linea cannot be directly called from Polkadot Hub. The contracts must be **recompiled** with `resolc` (Solidity → RISC-V/PolkaVM, not EVM bytecode) and **redeployed** to Polkadot Hub.

The project can — and should — **run on both chains simultaneously**. The architecture already supports multi-chain via wagmi/viem; we just need to add Polkadot Hub as another supported chain.

### What Works Out of the Box
- ✅ Both contracts (`HouseOfCards.sol`, `Leaderboard.sol`) use standard Solidity 0.8.19
- ✅ OpenZeppelin imports (`ReentrancyGuard`, `Ownable`) are supported
- ✅ No `SELFDESTRUCT`, `EXTCODECOPY`, or dynamic bytecode generation (no incompatible opcodes)
- ✅ Standard `call{value}` transfers, mappings, enums, events — all compatible
- ✅ wagmi + viem + RainbowKit natively support custom chains
- ✅ Polkadot Hub exposes Ethereum JSON-RPC — MetaMask/RainbowKit connect directly

### What Needs Adaptation
- ⚠️ Contracts must be compiled with `resolc` instead of `solc`
- ⚠️ Deployed addresses will differ (PolkaVM uses different address derivation)
- ⚠️ Gas is paid in **DOT** (testnet: **PAS**), not ETH
- ⚠️ `block.timestamp` semantics are slightly different (6-second blocks vs Linea's ~2s)
- ⚠️ Server-side contract interactions (ethers.js in `/server`) need dual-chain support

---

## Architecture: Dual-Chain Support

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                     │
│                                                          │
│  RainbowKit ── wagmi ── viem                             │
│       │                                                  │
│  ┌────┴────────────────────────────┐                     │
│  │     Chain Selector (config)     │                     │
│  ├─────────────┬───────────────────┤                     │
│  │ Linea Sep.  │  Polkadot Hub    │                     │
│  │ Chain: 59141│  Chain: 420420417 │                     │
│  │ Gas: ETH    │  Gas: PAS (DOT)  │                     │
│  │ Contracts:  │  Contracts:       │                     │
│  │  0x1DFd...  │   0x????...       │                     │
│  │  0x9E35...  │   0x????...       │                     │
│  └─────────────┴───────────────────┘                     │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────────────┐
│                   Server (Socket.io)                     │
│  ethers.js ── multi-provider (Linea + Polkadot Hub)     │
│  Oracle calls → whichever chain the game is on           │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 0: Setup & Contract Compilation (Day 1)
**Goal:** Verify contracts compile and deploy to Polkadot Hub TestNet.

- [ ] Install Hardhat Polkadot plugin and resolc compiler
  ```bash
  npm install --save-dev @parity/hardhat-polkadot
  npm install --save-dev @parity/resolc
  ```
- [ ] Create `hardhat.config.polkadot.ts` with Polkadot Hub TestNet config
  ```typescript
  // Network config
  {
    polkadotTestnet: {
      url: 'https://services.polkadothub-rpc.com/testnet',
      chainId: 420420417,
      accounts: [vars.get('PRIVATE_KEY')],
    }
  }
  ```
- [ ] Compile `HouseOfCards.sol` and `Leaderboard.sol` with `resolc`
- [ ] Get PAS test tokens from [Polkadot Faucet](https://faucet.polkadot.io/)
- [ ] Deploy both contracts to Polkadot Hub TestNet
- [ ] Verify contracts on [Blockscout](https://blockscout-testnet.polkadot.io/)
- [ ] Record deployed addresses

**Potential Issues:**
- `Ownable(msg.sender)` constructor pattern — should work but verify
- OpenZeppelin v4 `security/ReentrancyGuard` — confirm resolc compatibility
- `keccak256(bytes(difficulty))` string comparisons — standard, should work

---

### Phase 1: Frontend Multi-Chain Support (Day 2)
**Goal:** Add Polkadot Hub as a selectable chain in the frontend.

#### 1a. Define Polkadot Hub chain in `src/config/networks.ts`
```typescript
import { defineChain } from 'viem'

export const polkadotHubTestnet = defineChain({
  id: 420420417,
  name: 'Polkadot Hub TestNet',
  nativeCurrency: { name: 'PAS', symbol: 'PAS', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://services.polkadothub-rpc.com/testnet'] },
  },
  blockExplorers: {
    default: {
      name: 'Blockscout',
      url: 'https://blockscout-testnet.polkadot.io',
    },
  },
  testnet: true,
})
```

#### 1b. Update `SUPPORTED_CHAINS` and `RPC_ENDPOINTS`
- [ ] Add `polkadotHubTestnet` to `SUPPORTED_CHAINS`
- [ ] Add RPC endpoint for chain ID `420420417`
- [ ] Add explorer URL for Blockscout

#### 1c. Update `src/config/contracts.ts`
```typescript
export const CONTRACTS = {
  HOUSE_OF_CARDS: {
    // Chain-specific addresses
    addresses: {
      59141: '0x1DFd9003590E4A67594748Ecec18451e6cBDDD90',   // Linea Sepolia
      420420417: '0x...DEPLOYED_ADDRESS...',                    // Polkadot Hub TestNet
    },
    abi: 'HouseOfCardsABI',
  },
  LEADERBOARD: {
    addresses: {
      59141: '0x9E35aB6885bED1E34ea531d39CAe377815Ab7Fb9',
      420420417: '0x...DEPLOYED_ADDRESS...',
    },
    abi: 'LeaderboardABI',
  },
}
```

#### 1d. Update `src/components/Providers.tsx`
- [ ] Add transport for Polkadot Hub chain ID
- [ ] wagmi/RainbowKit will auto-show chain switcher

#### 1e. Update hooks that read contract addresses
- [ ] `useGameContract.ts` — resolve address from connected chain ID
- [ ] `useLeaderboard.ts` — resolve address from connected chain ID

---

### Phase 2: Server Multi-Chain Support (Day 3)
**Goal:** Server oracle can interact with contracts on either chain.

- [ ] Update server `.env` with Polkadot Hub RPC + contract addresses
  ```env
  POLKADOT_RPC_URL=https://services.polkadothub-rpc.com/testnet
  POLKADOT_GAME_CONTRACT=0x...
  POLKADOT_LEADERBOARD_CONTRACT=0x...
  ```
- [ ] Create multi-provider setup in server
  - Games track which chain they're on
  - Oracle calls route to correct provider/contract
- [ ] Update payment verification to check correct chain
- [ ] Test `completeTurn`, `timeoutTurn`, `eliminatePlayer`, `reportCollapse` on Polkadot Hub

---

### Phase 3: Polkadot-Native Features — Hackathon Differentiators (Day 4–5)
**Goal:** Leverage Polkadot Hub unique features to score higher on "Use of Polkadot Hub features" judging criteria.

#### 3a. XCM Cross-Chain Leaderboard (Stretch Goal)
- Use XCM precompiles to aggregate scores across parachains
- Leaderboard could pull data from multiple chains
- Interface: `IXCM` at `0x0000000000000000000000000000000000000803`

#### 3b. Native DOT Staking for Prize Pools
- Use Polkadot native assets for multiplayer pot
- Lower fees than Linea for microtransactions (0.001 stake)

#### 3c. Cross-Chain Game State (Stretch Goal)
- Bridge game results from Polkadot Hub → Linea via Snowbridge
- Unified cross-chain leaderboard

#### 3d. Storage Deposit Optimization
- Leverage Polkadot's storage deposit model vs Linea's gas model
- Potential cost savings for leaderboard storage

---

### Phase 4: Testing & Polish (Day 6–7)
- [ ] End-to-end test: Solo mode on Polkadot Hub TestNet
  - Connect wallet → play game → submit score → verify on Blockscout
- [ ] End-to-end test: Multiplayer on Polkadot Hub TestNet
  - Join game → pay stake in PAS → play → winner receives pot
- [ ] Verify chain switching works (Linea ↔ Polkadot Hub)
- [ ] Gas estimation accuracy on Polkadot Hub
- [ ] Mobile testing via MetaMask mobile
- [ ] Performance: block confirmation times (6s Polkadot vs 2s Linea)

---

### Phase 5: Submission Deliverables (Day 7–8)
- [ ] **Demo video** (1–3 minutes) showing:
  - Game running on Polkadot Hub TestNet
  - Chain switching between Linea and Polkadot Hub
  - On-chain leaderboard submission + verification
  - Multiplayer flow with PAS staking
- [ ] **Pitch deck** highlighting:
  - Multi-chain gaming infrastructure
  - Why Polkadot Hub is ideal (low fees, XCM, shared security)
  - Growth strategy: referral system + cross-chain reach
- [ ] **GitHub repo** — already open-source ✅
- [ ] **Project description** for DoraHacks submission

---

## Contract Compatibility Audit

### `HouseOfCards.sol` — PolkaVM Compatibility ✅

| Feature | Status | Notes |
|---------|--------|-------|
| `pragma solidity ^0.8.19` | ✅ | resolc supports 0.8.x |
| `ReentrancyGuard` (OZ) | ✅ | Standard modifier pattern |
| `Ownable` (OZ) | ✅ | No SELFDESTRUCT dependency |
| `msg.sender`, `msg.value` | ✅ | Mapped via ETH Proxy |
| `block.timestamp` | ✅ | Works but different block times |
| `call{value}` transfers | ✅ | Uses `seal_transfer` under hood |
| Mappings, arrays, structs | ✅ | Standard storage layout |
| Events/emit | ✅ | Fully supported |
| Enums | ✅ | Compiled as uint8 |
| `address(0)` checks | ✅ | Works with address aliasing |

### `Leaderboard.sol` — PolkaVM Compatibility ✅

| Feature | Status | Notes |
|---------|--------|-------|
| String mappings | ✅ | `keccak256` works |
| Insertion sort (view) | ✅ | Gas/weight differs but functional |
| Multi-level mappings | ✅ | Standard storage |
| Pure/view functions | ✅ | Read via ETH JSON-RPC |
| Custom `onlyOwner` | ✅ | Standard modifier |

### Known Differences to Handle
| Area | Linea Sepolia | Polkadot Hub TestNet |
|------|---------------|---------------------|
| Chain ID | 59141 | 420420417 |
| Currency | ETH | PAS (testnet) / DOT (mainnet) |
| Block time | ~2 seconds | ~6 seconds |
| Gas model | EVM gas | Weight (ref_time + proof_size) |
| RPC | `rpc.sepolia.linea.build` | `services.polkadothub-rpc.com/testnet` |
| Explorer | Lineascan | Blockscout |
| Compiler | solc | resolc |
| Wallet | MetaMask/RainbowKit | Same (via ETH Proxy) |

---

## Polkadot Hub Network Details

| Key | TestNet | MainNet |
|-----|---------|---------|
| **Network Name** | Polkadot Hub TestNet | Polkadot Hub |
| **Chain ID** | 420420417 | 420420419 |
| **Currency** | PAS | DOT |
| **RPC URL** | `https://services.polkadothub-rpc.com/testnet` | `https://services.polkadothub-rpc.com/mainnet` |
| **Explorer** | `https://blockscout-testnet.polkadot.io` | `https://blockscout.polkadot.io` |
| **Faucet** | [faucet.polkadot.io](https://faucet.polkadot.io/) | N/A |

---

## Hackathon Narrative / Pitch Angle

### "Agnej: The First Cross-Chain Physics Game"

**Problem:** Web3 games are siloed on single chains, fragmenting player communities and liquidity.

**Solution:** Agnej runs on both Linea and Polkadot Hub, with the same Solidity contracts deployed to both chains. Players choose their preferred chain; leaderboards and game mechanics work identically.

**Why Polkadot Hub?**
1. **Lower fees** — Microtransactions (0.001 stake) are cheaper on Polkadot Hub
2. **Shared security** — Inherits Polkadot's validator set from day one
3. **XCM potential** — Future cross-chain leaderboard aggregation
4. **EVM compatibility** — Same Solidity code, same dev tools, same wallets
5. **Snowbridge** — Future bridge to unify Linea ↔ Polkadot game state

**Judging Criteria Alignment:**
| Criteria | How We Score |
|----------|-------------|
| Technical implementation | Production-ready codebase, server-authoritative physics, smart contract integration |
| Use of Polkadot Hub features | Native EVM deployment, PAS staking, potential XCM integration |
| Innovation & impact | First physics-based competitive game on Polkadot Hub |
| UX and adoption potential | No PoH gate, referral system, mobile-optimized, chain-agnostic UX |
| Team execution | Existing deployed game on Linea, comprehensive docs, clean architecture |

---

## Resources

- [Polkadot Smart Contracts Docs](https://docs.polkadot.com/develop/smart-contracts/)
- [Hardhat Polkadot Plugin](https://github.com/paritytech/hardhat-polkadot)
- [resolc Compiler](https://github.com/paritytech/revive)
- [PolkaVM Missing Opcodes Guide](https://openguild.wtf/blog/polkadot/polkavm-missing-opcodes-and-workarounds)
- [OpenZeppelin Contracts Wizard for Polkadot](https://wizard.openzeppelin.com/polkadot)
- [Polkadot Faucet](https://faucet.polkadot.io/)
- [Hackathon Registration](https://dorahacks.io/hackathon/polkadot-solidity-hackathon/detail)
- [Builder Playbook](https://github.com/polkadot-developers/hackathon-guide/blob/master/polkadot-hub-devs.md)

---

*Created: 2026-03-12 — Polkadot Solidity Hackathon Implementation Plan*
