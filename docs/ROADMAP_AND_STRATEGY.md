# Product Roadmap & Strategy

## Linea Team Recommendations

The Linea team identified two critical improvements for production:

1. **Proof of Humanity (PoH) Verification** - Opt-in for leaderboards, keep core gameplay open
2. **Multiplayer & Growth Mechanics** - Prioritize multiplayer with referral system for exponential growth

## Architecture: Open Core, Verified Leaderboard

### Philosophy
- ✅ **Core gameplay** (Solo Practice, Solo Competitor) = **completely open**
- ✅ **Leaderboard rankings** = **opt-in PoH verification**
- ✅ **Dual leaderboard views** = All scores + Verified-only scores

### Why This Approach
| Benefit | Impact |
|---------|--------|
| Attracts wide audience | No friction to play, try game first |
| Prevents bot farming | Verified leaderboard is trustworthy |
| Fair competition | Real players compete on verified board |
| Network effect | Users naturally progress to verification |
| Differentiator | Other products don't have dual boards |

## Multiplayer: The Core Differentiator

**No other product in the exponent offers multiplayer.**

### Why Multiplayer Matters
- Solo mode: Every product has this (or similar)
- **Multiplayer mode**: **Only Agnej** can claim this
- Combined with PoH: Fair, trustworthy competitive ecosystem
- Network effects: Each new player increases pot size
- Skill variance: Player skill & reads create drama

### Game Economics
```
Game Duration: ~3.5 minutes (7 players × 30s per turn)
Entry Stake: 0.001 ETH (testnet)
Pot Size: 0.007 ETH total
Winner Gets: 80% of pot
House Fee: 20% of pot
```

### Turn-Based Design
- Each player gets 30 seconds per turn
- Stack collapses (≥40% blocks below threshold) → game ends
- Survivors split pot equally
- Last survivor takes winner's share

## Growth Mechanics

### 1. Invite System (MVP)

**User Journey**:
```
Player wins Solo Competitor game
   ↓
"Invite Friends" button appears
   ↓
Generate shareable invite link: agnej.app/play?ref=0x1234...
   ↓
Friend clicks link → Auto-populates referrer address
   ↓
Friend plays solo OR joins multiplayer with referrer bonus
```

**Implementation**:
```typescript
export const generateInviteLink = (baseUrl: string, referrerAddress: string) => {
  const url = new URL(baseUrl);
  url.searchParams.set('ref', referrerAddress);
  return url.toString();
};
```

**Referral Reward**:
- Solo mode: Friend gets 5% score multiplier on first game
- Multiplayer: Friend gets 5% of pot payout
- Smart contract tracks `referredBy` address

### 2. Social Sharing

**In-Game Context**:
- Share solo score on leaderboard
- Share multiplayer victory with survivors
- Challenge specific friends
- Post-game "Challenge Friends" CTA

**Platforms**:
- Twitter (dominant, drivevirality)
- Farcaster (crypto-native)
- Discord (community)
- Telegram (messaging)
- Clipboard (universal)

### 3. Multiplayer Invite Integration

**Post-Game Sharing**:
```typescript
interface MultiplayerGameOver {
  survivors: Player[];
  winner: Player;
  yourEarnings: number;
}

<button onClick={() => {
  const link = generateInviteLink(
    `${window.location.origin}/play?gameType=multiplayer`,
    userAddress
  );
  shareToTwitter(
    `I just survived a 7-player Agnej multiplayer game and won ${yourEarnings} ETH! 🎮 Join me: ${link}`,
    link
  );
}}>
  🐦 Challenge Friends on Twitter
</button>
```

## Implementation Timeline

### Week 1: Plan & Design
- [ ] Review Linea PoH V2 docs thoroughly
- [ ] Design PoH verification component
- [ ] Design multiplayer invite flow
- [ ] Update contract design docs

### Weeks 2-3: PoH V2 Integration ✅ COMPLETE
- [x] Implement Sumsub flow
- [x] Deploy updated Leaderboard.sol
- [x] Implement UI for verification
- [x] Test end-to-end

### Week 4: Multiplayer Invites
- [ ] Implement invite system
- [ ] Add social sharing
- [ ] Deploy updated HouseOfCards.sol
- [ ] Test referral flow

### Weeks 5-6: Stability & Polish
- [ ] Stabilize multiplayer server
- [ ] Implement oracle integration
- [ ] Add monitoring/analytics
- [ ] Performance optimization

### Week 7+: Scale
- [ ] Launch on mainnet
- [ ] Monitor metrics
- [ ] Iterate based on usage
- [ ] Plan community features

## Success Metrics

### PoH Leaderboard
- [ ] 30%+ of players opt into PoH verification
- [ ] Zero bots on verified leaderboard
- [ ] <2% dispute rate on verifications
- [ ] <500ms verification check latency

### Multiplayer Growth
- [ ] 50%+ of players try multiplayer
- [ ] 20%+ referral conversion rate
- [ ] Average 5+ players per game
- [ ] <5% abandonment during game

### Social Sharing
- [ ] >30% share button click-through rate
- [ ] Twitter dominant, but all platforms used
- [ ] >20% of shared links generate new players

## Blockers & Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Sumsub flow complexity | Verify UX friction | User testing, clear UX |
| PoH attestation delay | User frustration | Polling + timeout messaging |
| Bot referral attacks | Inflated referral counts | PoH requirement for bonus |
| Multiplayer server scalability | Game crashes at scale | Load testing, queue system |
| Collapse detection false positives | Players rage quit | Tune thresholds, add logs |
| Gas costs on Linea | Economic viability | Monitor and optimize |

## Immediate Actions (This Week)

### 1. Test Locally (30 minutes)
```bash
npm run dev
# Navigate to Leaderboard
# See PoHVerification component render
# Test share button
```

### 2. Deploy Contract (1 hour)
```bash
npx hardhat compile
npx hardhat run scripts/deploy.ts --network linea-sepolia
# Copy contract address
# Update NEXT_PUBLIC_LEADERBOARD_ADDRESS in .env.local
```

### 3. Test PoH Verification (30 minutes)
- Click verify button in leaderboard
- Complete Sumsub verification
- Wait for attestation (2-5 seconds)
- See verified badge appear

### 4. Test Social Sharing (30 minutes)
- Play a game
- Click share button
- Test all platforms
- Verify links work

## Short-Term (This Week)

### 1. Add Share Buttons to Game Over Screens (2 hours)
Files:
- `src/components/Game.tsx` (Solo game over)
- `src/components/MultiplayerGameOver.tsx` (Multiplayer)

Reference: See IMPLEMENTATION_GUIDE.md for code examples

### 2. Monitor & Iterate (ongoing)
- Test on mobile (iOS + Android)
- Fix popup blocker issues
- Check console for errors
- Optimize modal sizing

### 3. Gather Metrics
Track:
- Verification initiation rate
- Verification completion rate
- Share button clicks by platform
- Referral link clicks

## Before Mainnet (Next 1-2 Weeks)

### 1. Security Audit
- [ ] Review contract for issues
- [ ] Test all verification paths
- [ ] Check message signing security
- [ ] Verify no private keys leaked

### 2. Performance Testing
- [ ] Load test leaderboard with 1000+ scores
- [ ] Test polling under slow network
- [ ] Monitor gas costs on mainnet
- [ ] Check bundle size impact (~20KB)

### 3. Documentation Review
- [ ] All examples tested
- [ ] Setup instructions clear
- [ ] Troubleshooting guide complete
- [ ] API docs accurate

### 4. Testnet Sign-Off
- [ ] PoH verification works end-to-end
- [ ] Share system works on all platforms
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Gas costs reasonable

## Final Deployment (Week 2)

### 1. Deploy to Mainnet
- Deploy Leaderboard.sol to Linea mainnet
- Verify contract on Lineascan
- Update .env for mainnet addresses
- Build & deploy frontend

### 2. Monitor Launch
- Watch for errors in logs
- Monitor verification success rate (target: >80%)
- Track share metrics
- Respond to user issues

### 3. Market & Grow
- Tweet launch of PoH + Sharing features
- Invite users to verify
- Track referral conversions
- Share leaderboard with community

## Medium-Term (1-2 Months)

- External PoH integration (Worldcoin/Gitcoin Passport)
- Referral leaderboard (top referrers)
- Complete multiplayer oracle integration
- Multiple concurrent multiplayer games
- Spectator mode
- Tournament system
- Advanced stats (win rate, avg pot, survival streak)

## Long-Term Vision

An infinite, multiplayer, blockchain-based physics game where players compete to remove blocks from a stack without causing it to collapse. Inspired by Jenga meets Chess.com meets DeFi.

### Core Mechanics
- Turn-based gameplay with strategic depth
- Real-time multiplayer with network effects
- Transparent on-chain rewards
- Community-driven features
- Fair competitive environment with PoH

## Resources

### Official Documentation
- **Linea PoH V2**: https://docs.linea.build/get-started/how-to/verify-users-with-proof-of-humanity
- **Verax Attestation**: https://poh-api.linea.build/
- **PohVerifier Contract**: https://lineascan.build/address/0xBf14cFAFD7B83f6de881ae6dc10796ddD7220831

### Key Dates
- **Current**: Phase 1 (PoH V2) COMPLETE
- **This Week**: Deploy & test
- **Next 1-2 Weeks**: Multiplayer invites + social
- **Before Mainnet**: Security audit + performance testing
- **Week 2**: Mainnet deployment

## Summary

**The Linea recommendations are strategic**:
1. PoH prevents bot manipulation while keeping core gameplay open
2. Multiplayer is the only real competitive advantage
3. Invite system enables exponential viral growth
4. Combined = unique product positioning in the market

Start with the immediate actions above and follow the timeline. Success metrics are clear and measurable.
