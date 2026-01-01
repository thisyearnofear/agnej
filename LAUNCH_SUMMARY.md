# Agnej Mainnet Launch - Summary

## ✅ What's Ready

### Build Status
- ✅ **Frontend builds successfully** - `npm run build` passes
- ✅ **Server builds successfully** - `cd server && npm run build` passes
- ✅ **No TypeScript errors** - All type checking complete
- ✅ **Production build optimized** - Next.js 16 Turbopack with proper externals

### Code Quality
- ✅ **Smart contracts reviewed** - No obvious vulnerabilities
- ✅ **Multiplayer architecture tested** - Server-authoritative, minimal blockchain calls
- ✅ **Game physics stable** - Cannon.js server sim with 20Hz broadcasts
- ✅ **Web3 integration complete** - RainbowKit + Wagmi + Viem
- ✅ **Socket.io configured** - Real-time multiplayer communications

### Documentation
- ✅ **Complete deployment guide** - `docs/MAINNET_DEPLOYMENT.md`
- ✅ **Pre-launch checklist** - `DEPLOYMENT_CHECKLIST.md`
- ✅ **Deployment script** - `DEPLOY.sh` for automated VPS setup
- ✅ **Game mechanics documented** - `docs/GAME_MECHANICS.md`

## 📋 5-Step Launch Plan

### Step 1: Deploy Smart Contracts (6-12 hours)
**What:** Deploy to Linea Mainnet  
**How:** Use Remix or Hardhat  
**Contracts:**
- HouseOfCards.sol (game logic + referral system)
- Leaderboard.sol (score tracking)

**Save these addresses:**
```
HouseOfCards:     0x...
Leaderboard:      0x...
```

**Tools:**
- Remix: https://remix.ethereum.org
- Hardhat: See docs/MAINNET_DEPLOYMENT.md

### Step 2: Setup Server Infrastructure (4-8 hours)
**What:** Hetzner VPS + Nginx + PM2  
**How:** Follow steps in docs/MAINNET_DEPLOYMENT.md  

**Checklist:**
- [ ] Provision Hetzner VPS (CX31 or larger)
- [ ] SSH key configured
- [ ] Node.js 20+ installed
- [ ] Run: `DEPLOY.sh`
- [ ] Nginx configured with SSL
- [ ] Server running in PM2

**Quick Deploy Command:**
```bash
git clone https://github.com/thisyearnofear/agnej.git
cd agnej
./DEPLOY.sh  # Follow prompts for env vars
```

### Step 3: Configure Frontend (30 minutes)
**What:** Update environment variables  
**File:** `.env.production`

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0x[MAINNET_HOC]
NEXT_PUBLIC_LEADERBOARD_ADDRESS=0x[MAINNET_LB]
NEXT_PUBLIC_RPC_URL=https://rpc.linea.build
NEXT_PUBLIC_SERVER_URL=https://api.yourdomain.com
NEXT_PUBLIC_WALLET_CONNECT_ID=your_mainnet_id
NEXT_PUBLIC_CHAIN_ID=59144
```

**Deploy Options:**
- **Vercel (5 min):** Connect GitHub repo, add env vars, deploy
- **Self-hosted (20 min):** Nginx config on VPS

### Step 4: Run Pre-Launch Tests (2-4 hours)
**Checklist:** See DEPLOYMENT_CHECKLIST.md

**Critical Tests:**
- [ ] Frontend loads without errors
- [ ] Wallet connects to Linea Mainnet
- [ ] Solo game submits to blockchain
- [ ] Multiplayer game starts and completes
- [ ] Payouts calculate correctly
- [ ] No console errors on mobile

### Step 5: Launch & Monitor (Day 1+)
**Launch:**
- Announce on Twitter/Discord
- Post live URL
- Share with early testers

**Monitor:**
- Server: `pm2 logs agnej-server`
- Errors: Check browser console
- Transactions: Verify on Lineascan
- Performance: Check PM2 monit

## 🎯 Key Architecture

```
┌─────────────────┐
│   Frontend      │
│   Next.js 16    │
│  Vercel/VPS     │
└────────┬────────┘
         │
    HTTPS + WSS
         │
┌────────▼────────────┐       ┌──────────────────┐
│  Game Server        │◄─────►│  Linea Mainnet   │
│  Express + Socket.io│       │  Smart Contracts │
│  Hetzner VPS        │       │  - HouseOfCards  │
└─────────────────────┘       │  - Leaderboard   │
         │                    └──────────────────┘
         │
    ┌────▼─────────┐
    │ Cannon.js    │
    │ Physics Sim  │
    │ (Server)     │
    └──────────────┘

Game Flow:
1. Player connects to frontend
2. Frontend connects to server via Socket.io
3. Server runs physics simulation at 60Hz
4. State broadcasts at 20Hz
5. On game end, server reports to smart contract
```

## 💰 Gas Cost Estimates

**Per Game (7 players):**
- Entry stakes: 0.007 ETH total
- Contract interactions: ~$0.50 (reportCollapse)
- House cut: 20% of pot
- Player distribution: 80% to survivors

**Expected Volume (estimate):**
- 100 games/day = $50/day in gas
- 1000 games/day = $500/day in gas

## 📊 Monitoring Commands

```bash
# SSH into VPS
ssh root@<VPS_IP>

# View server logs (live)
pm2 logs agnej-server

# Monitor CPU/Memory
pm2 monit

# Check server status
pm2 status

# View specific game stats
curl http://127.0.0.1:3001/health

# Check Nginx
nginx -t
systemctl status nginx
```

## 🔒 Security Checklist

- [ ] Oracle private key never committed to git
- [ ] Environment files excluded from git (`.gitignore`)
- [ ] VPS firewall configured (only 80/443)
- [ ] HTTPS enforced on all endpoints
- [ ] Smart contracts verified on Lineascan
- [ ] No hardcoded addresses in code
- [ ] Rate limiting on API endpoints
- [ ] CORS configured correctly

## 🚨 Rollback Plan

If critical issues found:

```bash
# Quick rollback (revert last git commit)
git revert HEAD
npm run build
pm2 restart agnej-server

# Or disable multiplayer
# Edit server/src/index.ts, comment out game routes
# Deploy and restart

# Or switch to testnet
# Update NEXT_PUBLIC_CONTRACT_ADDRESS to Sepolia addresses
# Deploy and announce maintenance
```

## 📈 Success Metrics

**Track these after launch:**
- Daily active users (DAU)
- Games started per day
- Multiplayer join rate (%)
- Average payout per game
- Server uptime (%)
- Gas costs per game
- PoH verification rate (%)

## 📞 Support Resources

| Resource | URL |
|----------|-----|
| Linea Docs | https://docs.linea.build |
| Block Explorer | https://lineascan.build |
| RPC Status | https://status.linea.build |
| Hetzner Support | https://support.hetzner.com |
| Smart Contract Verification | Lineascan.build |

## 🎯 Estimated Timeline

| Phase | Duration | Days |
|-------|----------|------|
| Contract Deployment | 6-12 hours | Day 1 |
| Server Setup | 4-8 hours | Day 2 |
| Frontend Config | 30 min | Day 2 |
| Testing & Fixes | 2-4 hours | Day 3 |
| **LAUNCH** | — | **Day 3-4** |

**Total: 3-4 days from now**

## ✨ What Happens Next

Once live on mainnet, you have:

✅ **Solo Mode** - Open to everyone, no gas costs  
✅ **Leaderboard** - On-chain scores with optional PoH verification  
✅ **Multiplayer** - 7-player turn-based with real ETH stakes  
✅ **Referral System** - 5% bonus for referrers  
✅ **Social Sharing** - Twitter/Discord/Telegram integration  
✅ **Mobile Support** - Full responsive gameplay  

## 🚀 Ready to Launch?

Next action: Start with Step 1 in the 5-Step Launch Plan above.

Questions? Check the docs:
- `docs/MAINNET_DEPLOYMENT.md` - Full deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Pre-launch checklist
- `docs/GAME_MECHANICS.md` - How the game works
- `docs/SETUP_AND_ARCHITECTURE.md` - Technical architecture

**Let's ship it! 🎮**
