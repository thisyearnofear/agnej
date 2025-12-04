# Implementation Guide

## New Components Created

### PoH Verification Hook
**File**: `src/hooks/usePoHVerification.ts` (160 lines)

Features:
- `checkPoHStatus()` - Query Linea API
- `initiatePoHVerification()` - Open Sumsub popup
- `pollVerificationStatus()` - Poll until attestation confirmed
- Auto-check on mount and address changes

Usage:
```typescript
import { usePoHVerification } from '@/hooks/usePoHVerification'

const { isVerified, initiatePoHVerification, isVerifying } = usePoHVerification()

<button onClick={initiatePoHVerification} disabled={isVerifying}>
  Verify
</button>
```

### PoH Verification Component
**File**: `src/components/PoHVerification.tsx` (107 lines)

Props:
- `onVerified?: () => void` - Callback when verification completes
- `showFullFlow?: boolean` - Show detailed steps
- `compact?: boolean` - Minimal UI for inline use

Usage:
```typescript
<PoHVerification 
  onVerified={refetchLeaderboard} 
  compact={false}
/>
```

### Social Sharing Utilities
**File**: `src/lib/shareUtils.ts` (210+ lines)

Exports:
- `shareToTwitter(text, url)` - Twitter compose popup
- `shareToFarcaster(text, url)` - Warpcast integration
- `shareToDiscord(text, url)` - Clipboard copy
- `shareToTelegram(text, url)` - Telegram dialog
- `createSoloShareText(difficulty, score, rank)` - Pre-formatted message
- `createMultiplayerShareText(survivors, earnings, isWinner)` - Multiplayer message
- `shareGameAchievement(payload, platforms)` - Multi-platform sharing

### Game Share Modal
**File**: `src/components/GameShareModal.tsx` (200+ lines)

Features:
- Platform selection (Twitter, Farcaster, Discord, Telegram, Clipboard)
- Invite link display & copy button
- Message preview
- One-click multi-platform sharing
- Beautiful gradient UI

Usage:
```typescript
<GameShareModal
  isOpen={isShareOpen}
  onClose={() => setIsShareOpen(false)}
  payload={{
    type: 'solo',
    difficulty: 'HARD',
    score: 2500,
    rank: 3
  }}
  title="Share Your Score!"
/>
```

## Updated Files

### LeaderboardModal.tsx
- Replaced manual verification button with `<PoHVerification />`
- Removed old verification code
- Added automatic refetch on verification

### Leaderboard.sol Smart Contract
Major updates:
- Added `IPoHVerifier` interface
- Added `verifyPoHSigned()` - Production verification with Linea signature
- Added `verifyPoHOffchain()` - Backend oracle verification
- Added `verifyHuman()` - Backwards compatible legacy function
- Added `setPohVerifier()` & `transferOwnership()` - Admin functions

### LeaderboardABI.ts
- Added new contract function signatures
- Updated descriptions for Linea PoH V2

## Integration Steps

### For Game Over Screens

Add to your component:

```typescript
import GameShareModal from '@/components/GameShareModal'
import { GameSharePayload } from '@/lib/shareUtils'
import { useState } from 'react'

const [isShareOpen, setIsShareOpen] = useState(false)

const handleShare = (payload: GameSharePayload) => {
  setIsShareOpen(true)
}

// In JSX:
<button onClick={() => handleShare({
  type: 'solo',
  difficulty: difficulty,
  score: score,
  rank: rank
})}>
  🚀 Share Score
</button>

<GameShareModal
  isOpen={isShareOpen}
  onClose={() => setIsShareOpen(false)}
  payload={sharePayload}
  title="Share Your Score!"
/>
```

### For Multiplayer Game Over

```typescript
const sharePayload: GameSharePayload = {
  type: 'multiplayer',
  survivors: survivors.length,
  earnings: userEarnings,
  isWinner: winner === address
}

<button onClick={() => setIsShareOpen(true)}>
  🏆 Challenge Friends
</button>
```

## Deployment Checklist

### Local Testing
```bash
npm run dev
# Test PoH component rendering in Leaderboard
# Test share modal functionality
# Test on mobile (iOS + Android)
```

### Contract Deployment
```bash
# Compile
npx hardhat compile

# Deploy to Linea Sepolia
npx hardhat run scripts/deploy.ts --network linea-sepolia

# Verify on Lineascan
npx hardhat verify --network linea-sepolia <CONTRACT_ADDRESS>
```

### Update Frontend
```bash
# Update .env.local
NEXT_PUBLIC_LEADERBOARD_ADDRESS=0x... # new address

# Rebuild
npm run build
npm run dev
```

### End-to-End Testing
- [ ] Leaderboard loads without errors
- [ ] PoH verification flow works
- [ ] Share buttons in game over screens work
- [ ] Social media links open correctly
- [ ] Mobile responsive design works

## File Statistics

### Code Files
| Category | Count | Lines | Language |
|----------|-------|-------|----------|
| New Hooks | 1 | 160 | TypeScript |
| New Components | 2 | 320 | TypeScript/React |
| New Utils | 1 | 210 | TypeScript |
| Updated Components | 1 | 30 | TypeScript/React |
| Updated Contracts | 1 | 80 | Solidity |
| Updated ABI | 1 | 40 | TypeScript |
| **Total** | **7** | **840** | |

### Documentation
| Category | Count | Lines |
|----------|-------|-------|
| New Docs | 4 | 1400+ |
| Updated Docs | 2 | 420+ |
| **Total** | **6** | **1820+** |

## Where Things Are

### PoH Integration
```
src/hooks/usePoHVerification.ts          ← Main PoH logic
src/components/PoHVerification.tsx       ← UI component
src/components/LeaderboardModal.tsx      ← Using PoH component
contracts/Leaderboard.sol                ← Contract with PoH V2
src/abi/LeaderboardABI.ts               ← Contract ABI
```

### Social Sharing
```
src/lib/shareUtils.ts                    ← Sharing utilities
src/components/GameShareModal.tsx        ← Share modal
src/lib/inviteLinks.ts                   ← Invite link generation
```

## Testing Checklist

### Local Testing (No Contract Needed)
- [ ] Import components and hooks without errors
- [ ] PoH component renders in leaderboard
- [ ] Share modal opens/closes correctly
- [ ] Platform buttons select/deselect
- [ ] Copy invite link works
- [ ] Message preview updates correctly

### Testnet Testing (After Contract Deploy)
- [ ] Deploy new Leaderboard.sol to Linea Sepolia
- [ ] Update contract address in .env
- [ ] Click verify button in leaderboard
- [ ] Sumsub popup opens
- [ ] Complete verification flow
- [ ] Check Lineascan for transaction
- [ ] Verify badge appears after 2-5 seconds
- [ ] Share button opens modal
- [ ] Twitter opens with correct message
- [ ] Discord copies correctly
- [ ] Referral link format correct

## Known Limitations

1. **Sumsub Flow Edge Cases**
   - Handle popup blocked by browser
   - Handle user cancelling verification midway
   - Network timeout handling

2. **Polling Limitations**
   - 30-second timeout for attestation
   - May need retry mechanism
   - Consider user feedback during waiting

3. **Bundle Size**
   - Total impact: ~20KB (minified, ~5KB gzipped)
   - Monitor for performance impact

## Success Criteria

✅ All Linea team recommendations implemented  
✅ PoH V2 API integration complete  
✅ Sumsub web flow integrated  
✅ Smart contract updated  
✅ Multi-platform social sharing  
✅ Referral system ready  
✅ Type-safe throughout  
✅ Error handling included  
✅ Comprehensive documentation  
✅ Ready for testnet deployment  

## Next Steps

1. **Add share buttons** to game over screens (5 min each)
2. **Deploy contract** to Linea Sepolia
3. **Test PoH flow** end-to-end
4. **Test social sharing** on mobile
5. **Monitor metrics** (verification rate, share usage)
6. **Deploy to mainnet** when ready

## Support Resources

**Linea PoH V2 Docs**:
https://docs.linea.build/get-started/how-to/verify-users-with-proof-of-humanity

**Linea PoH V2 API**:
https://poh-api.linea.build/poh/v2/{address}

**PohVerifier Contract**:
0xBf14cFAFD7B83f6de881ae6dc10796ddD7220831

**Sumsub Integration**:
https://in.sumsub.com/websdk/p/uni_BKWTkQpZ2EqnGoY7
