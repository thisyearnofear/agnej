# Agnej Mainnet Deployment Guide

Complete checklist to deploy Agnej multiplayer on Linea Mainnet with full Web3 integration.

## Prerequisites

- [ ] Linea Mainnet ETH in deployer wallet (for contract deployment)
- [ ] Private key for oracle account (to report game collapses on-chain)
- [ ] Domain name for production server (optional but recommended)
- [ ] WalletConnect Project ID (for mainnet)
- [ ] Hetzner VPS or similar (4GB RAM, 2 vCPU minimum)

## Phase 1: Smart Contract Deployment

### Step 1: Prepare Contracts for Mainnet

1. **Review contract addresses in contracts/:**
   - `HouseOfCards.sol` - Main game logic & referral system
   - `Leaderboard.sol` - Score tracking & PoH verification

2. **Update ENTRY_STAKE if needed** (currently 0.001 ETH):
   ```solidity
   // contracts/HouseOfCards.sol
   uint256 public constant ENTRY_STAKE = 0.001 ether; // Adjust for mainnet economics
   ```

3. **Verify OpenZeppelin imports are correct**:
   ```bash
   npm list @openzeppelin/contracts
   ```

### Step 2: Deploy Using Remix or Hardhat

**Option A: Using Remix (Recommended for safety)**

1. Go to https://remix.ethereum.org
2. Create new file: `HouseOfCards.sol`
3. Copy contents from `contracts/HouseOfCards.sol`
4. Install OpenZeppelin:
   - Use Remix import: `import "@openzeppelin/contracts/..."`
   - Remix will auto-fetch from NPM
5. Compile: Select Solidity Compiler 0.8.19
6. Deploy:
   - Network: Connect wallet to Linea Mainnet
   - Select "HouseOfCards" contract
   - Click Deploy
   - Confirm transaction in wallet

**Option B: Using Hardhat (for automation)**

1. Install Hardhat:
   ```bash
   npm install --save-dev hardhat
   npx hardhat
   ```

2. Create `hardhat.config.ts`:
   ```typescript
   import { HardhatUserConfig } from "hardhat/config";
   import "@nomicfoundation/hardhat-toolbox";

   const config: HardhatUserConfig = {
     solidity: "0.8.19",
     networks: {
       linea: {
         url: "https://rpc.linea.build",
         accounts: [process.env.DEPLOYER_PRIVATE_KEY || ""],
         chainId: 59144
       }
     }
   };

   export default config;
   ```

3. Deploy script `scripts/deploy.ts`:
   ```typescript
   import { ethers } from "hardhat";

   async function main() {
     const HouseOfCards = await ethers.getContractFactory("HouseOfCards");
     const hoc = await HouseOfCards.deploy();
     await hoc.deployed();
     console.log("HouseOfCards deployed to:", hoc.address);

     const Leaderboard = await ethers.getContractFactory("Leaderboard");
     const lb = await Leaderboard.deploy(hoc.address);
     await lb.deployed();
     console.log("Leaderboard deployed to:", lb.address);
   }

   main().catch((error) => {
     console.error(error);
     process.exitCode = 1;
   });
   ```

4. Deploy:
   ```bash
   export DEPLOYER_PRIVATE_KEY=your_private_key
   npx hardhat run scripts/deploy.ts --network linea
   ```

### Step 3: Record Deployed Addresses

Save these addresses immediately:
```
HouseOfCards:  0x...
Leaderboard:   0x...
```

## Phase 2: Frontend Configuration

### Step 1: Update Environment Variables

**Frontend (.env.production):**
```bash
# Blockchain
NEXT_PUBLIC_CONTRACT_ADDRESS=0x[MAINNET_HOUSE_OF_CARDS_ADDRESS]
NEXT_PUBLIC_LEADERBOARD_ADDRESS=0x[MAINNET_LEADERBOARD_ADDRESS]
NEXT_PUBLIC_RPC_URL=https://rpc.linea.build

# Server
NEXT_PUBLIC_SERVER_URL=https://api.yourdomain.com  # or your VPS IP

# WalletConnect
NEXT_PUBLIC_WALLET_CONNECT_ID=your_mainnet_project_id

# Game Config
NEXT_PUBLIC_CHAIN_ID=59144  # Linea Mainnet
NEXT_PUBLIC_ENTRY_STAKE=0.001  # In ETH
```

### Step 2: Update Wagmi/RainbowKit Chain Config

**src/components/Providers.tsx:**
```typescript
import { createConfig, http } from 'wagmi'
import { linea } from 'wagmi/chains'

const config = createConfig({
  chains: [linea],  // Only mainnet
  transports: {
    [linea.id]: http('https://rpc.linea.build'),
  },
})
```

## Phase 3: Server Deployment

### Step 1: Setup Hetzner VPS

1. **Create VPS**
   - OS: Ubuntu 22.04 LTS
   - Size: CX31 (4GB RAM, 2 vCPU) minimum
   - Location: Pick closest to players

2. **Initial Setup**
   ```bash
   # SSH into VPS
   ssh root@<VPS_IP>

   # Update system
   apt update && apt upgrade -y

   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   apt install -y nodejs

   # Install Git
   apt install -y git

   # Install PM2 (process manager)
   npm install -g pm2
   ```

### Step 2: Deploy Application

```bash
# Clone repo
git clone https://github.com/thisyearnofear/agnej.git
cd agnej

# Install dependencies
npm install
cd server && npm install && cd ..

# Build frontend
npm run build

# Build server
cd server && npm run build && cd ..
```

### Step 3: Configure Server Environment

```bash
# Create .env.production in server directory
cat > server/.env.production << 'EOF'
# Server Config
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com

# Blockchain - Linea Mainnet
RPC_URL=https://rpc.linea.build
CONTRACT_ADDRESS=0x[MAINNET_ADDRESS]
LEADERBOARD_ADDRESS=0x[MAINNET_LEADERBOARD_ADDRESS]

# Oracle Private Key (for reporting game collapses)
ORACLE_PRIVATE_KEY=0x[YOUR_ORACLE_PRIVATE_KEY]

# Optional: Analytics
ENVIRONMENT=production
EOF

chmod 600 server/.env.production
```

### Step 4: Start Server with PM2

```bash
# Start server
pm2 start server/dist/index.js --name "agnej-server" --env production

# Save PM2 config
pm2 save

# Setup auto-restart on reboot
pm2 startup
pm2 save
```

### Step 5: Setup Nginx Reverse Proxy with SSL

```bash
# Install Nginx and Certbot
apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config
cat > /etc/nginx/sites-available/agnej << 'EOF'
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/agnej /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Setup SSL
certbot --nginx -d api.yourdomain.com
```

### Step 6: Monitor Server Health

```bash
# View logs
pm2 logs agnej-server

# Monitor CPU/Memory
pm2 monit

# Setup log rotation
cat > /etc/logrotate.d/agnej << 'EOF'
/root/.pm2/logs/* {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 root root
}
EOF
```

## Phase 4: Frontend Deployment

### Option A: Deploy to Vercel (Recommended)

1. **Connect to GitHub**
   ```bash
   git push origin main
   ```

2. **Create Vercel Project**
   - Go to https://vercel.com/new
   - Import GitHub repo
   - Project settings:
     - Framework: Next.js
     - Build Command: `npm run build`
     - Output Directory: `.next`

3. **Add Environment Variables in Vercel Dashboard**
   ```
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
   NEXT_PUBLIC_LEADERBOARD_ADDRESS=0x...
   NEXT_PUBLIC_RPC_URL=https://rpc.linea.build
   NEXT_PUBLIC_SERVER_URL=https://api.yourdomain.com
   NEXT_PUBLIC_WALLET_CONNECT_ID=...
   NEXT_PUBLIC_CHAIN_ID=59144
   NEXT_PUBLIC_ENTRY_STAKE=0.001
   ```

4. **Deploy**
   - Click Deploy
   - Takes 2-3 minutes

### Option B: Deploy to Self-Hosted VPS

```bash
# On VPS
cd /var/www
git clone https://github.com/thisyearnofear/agnej.git agnej
cd agnej

# Install & build
npm install
npm run build

# Create Nginx config for frontend
cat > /etc/nginx/sites-available/agnej-web << 'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/agnej/.next/standalone;

    location / {
        try_files $uri $uri/ /index.html;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /api {
        proxy_pass https://api.yourdomain.com;
    }
}
EOF

ln -s /etc/nginx/sites-available/agnej-web /etc/nginx/sites-enabled/
certbot --nginx -d yourdomain.com -d www.yourdomain.com
systemctl restart nginx
```

## Phase 5: Pre-Launch Testing

### Test Checklist

- [ ] **Frontend Loading**
  - [ ] Site loads at yourdomain.com
  - [ ] No console errors
  - [ ] RainbowKit connects to Linea Mainnet

- [ ] **Solo Mode**
  - [ ] Can play solo practice (no blockchain calls)
  - [ ] Can submit score to leaderboard contract
  - [ ] Score appears on leaderboard
  - [ ] Rank calculation correct

- [ ] **Multiplayer**
  - [ ] Can create game
  - [ ] Can join game
  - [ ] Turn-based gameplay works
  - [ ] Server broadcasts positions correctly
  - [ ] Game can be completed
  - [ ] Payouts distributed correctly

- [ ] **Transactions**
  - [ ] Entry stake deducted from wallet
  - [ ] Transaction shows on Lineascan
  - [ ] No gas estimation errors

- [ ] **Mobile**
  - [ ] Touch controls work
  - [ ] Responsive layout
  - [ ] Wallet connect on mobile

- [ ] **Monitoring**
  - [ ] Server logs show activity
  - [ ] No memory leaks (check PM2 monit)
  - [ ] API responses under 1s

### Load Testing

```bash
# Test with 10 concurrent connections
ab -n 1000 -c 10 https://api.yourdomain.com/health

# Monitor with htop
htop
```

## Phase 6: Launch Monitoring

### Setup Alerts

1. **PM2 Plus (Optional)**
   ```bash
   pm2 link [secret_key] [public_key]
   ```
   - Monitor uptime
   - Get alerts on crashes

2. **Log Aggregation**
   ```bash
   # Export logs to file for analysis
   pm2 logs agnej-server > /var/log/agnej.log &
   ```

### Daily Checks

- [ ] Server running (`pm2 status`)
- [ ] No critical errors in logs
- [ ] Multiplayer games completing successfully
- [ ] Payments being processed

## Rollback Plan

If critical issues found:

```bash
# Revert to previous version
cd /var/www/agnej
git revert HEAD
npm run build
pm2 restart agnej-server

# Or disable multiplayer temporarily
# and let solo mode run while investigating
```

## Contact for Help

- **Linea Support**: https://linea.help
- **RPC Status**: https://status.linea.build
- **Smart Contract Questions**: Check Lineascan

## Success Criteria

✅ Frontend loads at custom domain  
✅ Wallet connects to Linea Mainnet  
✅ Solo games submit to blockchain  
✅ Multiplayer lobby appears and games start  
✅ Payouts distribute correctly  
✅ No critical console errors  
✅ Mobile gameplay smooth  
✅ Server stays up for 24+ hours  

Once all criteria met, you're LIVE on Linea Mainnet! 🚀
