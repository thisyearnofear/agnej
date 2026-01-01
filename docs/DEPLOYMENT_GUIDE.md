# Agnej Deployment Guide

This guide consolidates all deployment-related information for Agnej, including smart contract deployment, server setup, frontend configuration, and testing.

## Table of Contents
- [Smart Contract Deployment](#smart-contract-deployment)
- [Server Deployment](#server-deployment)
- [Frontend Configuration](#frontend-configuration)
- [Testing and Launch](#testing-and-launch)

## Smart Contract Deployment

### Prerequisites
- Linea Mainnet ETH in deployer wallet
- Private key for oracle account
- Domain name for production server
- WalletConnect Project ID

### Deployment Steps

1. **Prepare Contracts**:
   - Review `contracts/HouseOfCards.sol` and `contracts/Leaderboard.sol`.
   - Update `ENTRY_STAKE` if needed (currently 0.001 ETH).

2. **Deploy Using Remix or Hardhat**:
   - **Remix**: Use Remix IDE to deploy contracts to Linea Mainnet.
   - **Hardhat**: Use the provided Hardhat configuration and deployment script.

3. **Record Deployed Addresses**:
   - Save the deployed contract addresses for `HouseOfCards` and `Leaderboard`.

## Server Deployment

### Prerequisites
- Hetzner VPS or similar (4GB RAM, 2 vCPU minimum)
- Node.js 20+ installed
- PM2 for process management
- Nginx for reverse proxy

### Deployment Steps

1. **Setup Hetzner VPS**:
   - Provision a VPS with Ubuntu 22.04 LTS.
   - Install Node.js, Git, and PM2.

2. **Deploy Application**:
   - Clone the repository and install dependencies.
   - Build the frontend and server.

3. **Configure Server Environment**:
   - Create `server/.env.production` with the required environment variables.

4. **Start Server with PM2**:
   - Start the server using PM2 and enable auto-restart.

5. **Setup Nginx Reverse Proxy with SSL**:
   - Configure Nginx to proxy requests to the server.
   - Set up SSL using Certbot.

## Frontend Configuration

### Environment Variables

Update `.env.production` with the following variables:

```bash
NEXT_PUBLIC_CONTRACT_ADDRESS=0x[MAINNET_HOUSE_OF_CARDS_ADDRESS]
NEXT_PUBLIC_LEADERBOARD_ADDRESS=0x[MAINNET_LEADERBOARD_ADDRESS]
NEXT_PUBLIC_RPC_URL=https://rpc.linea.build
NEXT_PUBLIC_SERVER_URL=https://api.yourdomain.com
NEXT_PUBLIC_WALLET_CONNECT_ID=your_mainnet_project_id
NEXT_PUBLIC_CHAIN_ID=59144
NEXT_PUBLIC_ENTRY_STAKE=0.001
```

### Deployment Options

- **Vercel**: Connect to GitHub and deploy.
- **Self-hosted VPS**: Configure Nginx and deploy.

## Testing and Launch

### Pre-Launch Testing

- **Frontend Loading**: Ensure the site loads without errors.
- **Wallet Connection**: Verify wallet connection to Linea Mainnet.
- **Solo Mode**: Test solo practice and competitor modes.
- **Multiplayer**: Test game creation, joining, and completion.
- **Mobile Testing**: Ensure responsive design and touch controls work.

### Launch Monitoring

- **Server Logs**: Monitor server logs using `pm2 logs agnej-server`.
- **Performance**: Check CPU and memory usage with `pm2 monit`.
- **Transactions**: Verify transactions on Lineascan.

### Rollback Plan

If critical issues are found:
- Revert to the previous version using `git revert HEAD`.
- Disable multiplayer temporarily if needed.
- Switch to testnet if necessary.

## Resources

- **Linea Docs**: [https://docs.linea.build](https://docs.linea.build)
- **Block Explorer**: [https://lineascan.build](https://lineascan.build)
- **RPC Status**: [https://status.linea.build](https://status.linea.build)
- **Hetzner Support**: [https://support.hetzner.com](https://support.hetzner.com)
