# Agnej Mainnet Launch Checklist

Complete this before going live on Linea Mainnet.

## Pre-Deployment (Today)

- [ ] **Build is green** - `npm run build` passes without errors
- [ ] **Contracts reviewed** - No obvious bugs in HouseOfCards.sol and Leaderboard.sol
- [ ] **Reviewed docs/MAINNET_DEPLOYMENT.md** - Understand full deployment process

## Smart Contracts (Day 1-2)

- [ ] **Deploy HouseOfCards.sol to Linea Mainnet**
  - [ ] Save contract address: `0x...`
  - [ ] Verify on Lineascan
  - [ ] Test with small transaction

- [ ] **Deploy Leaderboard.sol to Linea Mainnet**
  - [ ] Save contract address: `0x...`
  - [ ] Verify on Lineascan
  - [ ] Update ABI if changed

- [ ] **Contracts Verified on Lineascan**
  - [ ] Can read source code on explorer
  - [ ] All functions accessible

## Server Setup (Day 2-3)

- [ ] **Provision Hetzner VPS**
  - [ ] CX31 or larger
  - [ ] Ubuntu 22.04 LTS
  - [ ] Static IP assigned

- [ ] **Server Security**
  - [ ] SSH key configured (no password)
  - [ ] Firewall enabled (UFW)
  - [ ] Only ports 80/443 open to internet

- [ ] **Install & Configure Server**
  - [ ] Node.js 20+ installed
  - [ ] PM2 configured
  - [ ] Nginx reverse proxy working
  - [ ] SSL certificate active

- [ ] **Deploy Backend**
  - [ ] Code pulled from GitHub
  - [ ] `.env.production` set with mainnet addresses
  - [ ] Server builds without errors (`npm run build`)
  - [ ] Server starts and stays running (`pm2 start`)

- [ ] **Test Server Health**
  - [ ] Can curl API endpoint
  - [ ] Logs show no errors
  - [ ] Memory/CPU usage stable

## Frontend Configuration (Day 3)

- [ ] **Update .env.production**
  - [ ] `NEXT_PUBLIC_CONTRACT_ADDRESS=0x...` (mainnet)
  - [ ] `NEXT_PUBLIC_LEADERBOARD_ADDRESS=0x...` (mainnet)
  - [ ] `NEXT_PUBLIC_RPC_URL=https://rpc.linea.build`
  - [ ] `NEXT_PUBLIC_SERVER_URL=https://api.yourdomain.com`
  - [ ] `NEXT_PUBLIC_WALLET_CONNECT_ID=...` (mainnet)
  - [ ] `NEXT_PUBLIC_CHAIN_ID=59144`

- [ ] **Wagmi Configuration**
  - [ ] Only Linea Mainnet chain in config
  - [ ] RPC endpoint points to mainnet

- [ ] **Build Frontend**
  - [ ] `npm run build` completes
  - [ ] No TypeScript errors
  - [ ] Bundle size reasonable

- [ ] **Deploy Frontend**
  - [ ] Vercel OR self-hosted VPS
  - [ ] Environment variables set
  - [ ] Custom domain configured
  - [ ] HTTPS working
  - [ ] Site loads at yourdomain.com

## Pre-Launch Testing (Day 4)

### Basic Functionality
- [ ] **Frontend Loads**
  - [ ] No console errors in browser
  - [ ] No network errors
  - [ ] All UI elements visible

- [ ] **Wallet Connection**
  - [ ] RainbowKit modal opens
  - [ ] Can connect MetaMask
  - [ ] Shows Linea Mainnet
  - [ ] Shows correct account balance

### Solo Mode Testing
- [ ] **Play Solo Practice**
  - [ ] Game initializes
  - [ ] Can move blocks
  - [ ] Physics feel responsive
  - [ ] Game over works

- [ ] **Solo Competitor**
  - [ ] 30-second timer works
  - [ ] Can submit score
  - [ ] Wallet prompted for signature
  - [ ] Transaction confirmed on Lineascan
  - [ ] Score appears on leaderboard
  - [ ] Rank displays correctly

### Multiplayer Testing
- [ ] **Create Game**
  - [ ] Can enter game lobby
  - [ ] Entry stake deducted
  - [ ] Game appears in lobby list

- [ ] **Join Game**
  - [ ] Can find and join game
  - [ ] Players list shows all 7 participants
  - [ ] Entry stake deducted

- [ ] **Play Game**
  - [ ] Turn-based system works
  - [ ] 30-second turn timer counts down
  - [ ] Can see other players' moves
  - [ ] Game advances smoothly

- [ ] **Game Completion**
  - [ ] Tower collapse detected correctly
  - [ ] Winner determined
  - [ ] Payouts calculated
  - [ ] Transactions broadcast on-chain

- [ ] **Leaderboard**
  - [ ] Scores update after game
  - [ ] Rankings correct
  - [ ] Can filter by difficulty

### Mobile Testing
- [ ] **iOS (iPhone)**
  - [ ] Responsive design works
  - [ ] Touch controls responsive
  - [ ] Wallet connect works
  - [ ] Game playable

- [ ] **Android**
  - [ ] Responsive design works
  - [ ] Touch controls responsive
  - [ ] Wallet connect works
  - [ ] Game playable

### Performance Testing
- [ ] **Load Time**
  - [ ] Frontend loads in <3s
  - [ ] API responds in <1s
  - [ ] Leaderboard renders in <2s

- [ ] **Server Stability**
  - [ ] PM2 shows "online" status
  - [ ] Memory usage under 1GB
  - [ ] CPU usage under 50%
  - [ ] No crashes in 1 hour of play

## Launch Day (Day 5)

- [ ] **Final System Check**
  - [ ] All 3 addresses in contracts/ deployed
  - [ ] Frontend environment vars correct
  - [ ] Server running with correct oracle key
  - [ ] Logs show no critical errors

- [ ] **Soft Launch (Optional)**
  - [ ] Tell 5-10 testers about live URL
  - [ ] Monitor feedback for 2-4 hours
  - [ ] Watch logs for errors
  - [ ] Check transaction throughput

- [ ] **Public Launch**
  - [ ] Announce on Twitter/Discord
  - [ ] Post live link
  - [ ] Monitor first 24 hours closely

## Post-Launch (Day 6+)

- [ ] **Daily Monitoring**
  - [ ] Check server is running
  - [ ] Review logs for errors
  - [ ] Verify transactions going through
  - [ ] Monitor player counts

- [ ] **Weekly Maintenance**
  - [ ] Update server dependencies
  - [ ] Review gas costs
  - [ ] Check contract state
  - [ ] Backup logs

- [ ] **Ongoing**
  - [ ] Fix bugs as reported
  - [ ] Monitor PoH verification rate
  - [ ] Track referral metrics
  - [ ] Optimize multiplayer matching

## Critical Addresses

```
HouseOfCards:     0x[SAVE_HERE]
Leaderboard:      0x[SAVE_HERE]
Server URL:       https://[api.yourdomain.com]
Frontend URL:     https://[yourdomain.com]
Oracle Account:   0x[KEEP_SAFE]
Oracle PK:        0x[KEEP_SAFE]
```

## Emergency Contacts

- Linea Support: support@linea.build
- Hetzner Support: https://support.hetzner.com
- Your Domain Registrar Support

## Notes

```
[Add any notes specific to your deployment here]
```

---

**Last Updated:** 2025-12-28  
**Status:** Ready for deployment ✅
