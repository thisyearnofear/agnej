#!/bin/bash

# Agnej Mainnet Deployment Script
# Run this on your Hetzner VPS after cloning the repo

set -e  # Exit on error

echo "🚀 Agnej Mainnet Deployment"
echo "============================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. System Setup
echo -e "${YELLOW}[1/5] Setting up system...${NC}"

if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

echo -e "${GREEN}✓ System ready${NC}"

# 2. Install Dependencies
echo ""
echo -e "${YELLOW}[2/5] Installing dependencies...${NC}"

npm install
cd server && npm install && cd ..

echo -e "${GREEN}✓ Dependencies installed${NC}"

# 3. Build Projects
echo ""
echo -e "${YELLOW}[3/5] Building frontend and server...${NC}"

npm run build
cd server && npm run build && cd ..

echo -e "${GREEN}✓ Build complete${NC}"

# 4. Configure Environment
echo ""
echo -e "${YELLOW}[4/5] Configuring environment...${NC}"

if [ ! -f "server/.env.production" ]; then
    echo -e "${RED}⚠ server/.env.production not found!${NC}"
    echo "Create it with the following variables:"
    echo ""
    cat << 'EOF'
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
RPC_URL=https://rpc.linea.build
CONTRACT_ADDRESS=0x[YOUR_CONTRACT_ADDRESS]
LEADERBOARD_ADDRESS=0x[YOUR_LEADERBOARD_ADDRESS]
ORACLE_PRIVATE_KEY=0x[YOUR_ORACLE_PRIVATE_KEY]
EOF
    echo ""
    echo "Then run this script again."
    exit 1
else
    echo -e "${GREEN}✓ .env.production found${NC}"
fi

# 5. Start Server
echo ""
echo -e "${YELLOW}[5/5] Starting server with PM2...${NC}"

pm2 start server/dist/index.js --name "agnej-server" --env production
pm2 save
pm2 startup

echo ""
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Install and configure Nginx (see docs/MAINNET_DEPLOYMENT.md)"
echo "2. Setup SSL certificate with Certbot"
echo "3. Deploy frontend to Vercel or your domain"
echo "4. Run monitoring:"
echo ""
echo "   pm2 logs agnej-server"
echo "   pm2 monit"
echo ""
