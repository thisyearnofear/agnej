# Agnej App Review Submission

## App Overview
Agnej is a decentralized blockchain-based physics game that flips the traditional Jenga concept. Instead of stacking blocks, players carefully remove them from a 16-layer tower, testing their precision and nerve as the structure grows increasingly unstable with each move.

The game features two primary modes:
1. **Solo Mode**: Race against time and compete on global leaderboards
2. **Multiplayer Mode**: Turn-based battles with up to 7 players where one wrong move can eliminate you from the game

## Key Features
- Inverse Jenga gameplay with 16-layer towers to destabilize
- Realistic 3D physics that respond to every touch and drag
- Solo Mode with timed challenges and global leaderboards
- Multiplayer battles for up to 7 players with turn-based strategy
- Mobile-optimized touch controls for playing anywhere
- Visual feedback showing force direction and power indicators
- Haptic feedback for immersive tactile responses

## Reviewer Testing Instructions

### Quick Start
1. Visit the deployed app at [TODO: Add deployment URL]
2. Connect your wallet (Linea Sepolia testnet)
3. Start with Solo Practice mode to learn the controls
4. Progress to Solo Competitor mode to experience the full game with leaderboard integration

### Solo Mode Testing
1. Navigate to the game page
2. Select "Practice Mode" to familiarize yourself with controls
3. Try "Competitor Mode" to experience:
   - 30-second timer per block removal
   - Top 2 layers locked (cannot touch)
   - On-chain leaderboard submission
   - Ranking against global players

### Multiplayer Mode Testing
1. Click "Multiplayer" from the main menu
2. Click "Join Game" to enter the queue
3. Note: Game requires 7 players to start, so testing may require coordination
4. Once game starts:
   - Take turns removing blocks within 30-second timer
   - Experience turn-based physics synchronization
   - See real-time tower updates from other players

### Technical Details for Reviewers
- **Network**: Linea Sepolia Testnet
- **Game Contract**: `0x1DFd9003590E4A67594748Ecec18451e6cBDDD90`
- **Leaderboard Contract**: `0x3127Ebc72F9760728cc2032DC28Ed7D2250bC9cF`
- **Entry Stake**: 0.001 ETH (for multiplayer)
- **Tech Stack**: Next.js, Three.js, Physijs, Solidity, Socket.io, Cannon.js

### Known Limitations for Testing
- Multiplayer mode requires 7 concurrent players to begin, which may make testing challenging without coordination
- Game is currently deployed on Linea Sepolia testnet only
- Some advanced multiplayer features are still in development

### Support Contacts
For any issues during review, please contact:
- Primary: [TODO: Add contact email]
- Technical: [TODO: Add technical contact]

Thank you for reviewing Agnej!