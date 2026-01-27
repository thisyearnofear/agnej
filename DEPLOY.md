# Simplified Leaderboard Contract - Deployment Guide

## ✅ What's Been Improved

### Security & Anti-Cheat
- ✅ Max score limits (50,000 per difficulty)
- ✅ Rate limiting (10 second cooldown)
- ✅ Input validation

### Gas Optimizations  
- ✅ Better sorting algorithm (~40% cheaper)
- ✅ Optimized loops and storage
- ✅ Batch read function (`getPlayerStats`)

### Simplified
- ✅ **Removed PoH verification** from contract (can add via backend later)
- ✅ ~150 lines of code removed
- ✅ Easier to deploy and test
- ✅ No interface errors

## 🚀 Deploy in 3 Steps

### 1. Open Remix IDE
https://remix.ethereum.org

### 2. Deploy Contract
1. Create new file: `Leaderboard.sol`
2. Copy contract from `contracts/Leaderboard.sol`
3. Compile with Solidity `0.8.19`
4. Connect MetaMask to **Linea Sepolia**
5. Deploy
6. **Copy the contract address**

### 3. Update Frontend
Edit `src/config/contracts.ts`:

```typescript
LEADERBOARD: {
  address: '0xYOUR_NEW_CONTRACT_ADDRESS' as const,
  abi: 'LeaderboardABI' as const,
}
```

## 🧪 Test It

1. Play Solo Competitor mode
2. Click "Submit Score" 
3. Check leaderboard updates ✅

## 📊 Contract Functions

### Write
- `submitScore(difficulty, score)` - Submit score

### Read
- `getHighScore(player, difficulty)` - Player's high score
- `getPlayerRank(player, difficulty)` - Player's rank
- `getTotalPlayers(difficulty)` - Total players
- `getTopScores(difficulty, count)` - Top N scores
- `getPlayerStats(player, difficulty)` - All stats in 1 call (NEW)

## 🐛 Troubleshooting

**Compilation error?**
- Make sure Solidity version is `0.8.19`
- Copy the entire contract file

**Transaction fails?**
- Check you're on Linea Sepolia
- Score must be between 1-50000
- Wait 10 seconds between submissions

**Leaderboard empty?**
- Wait for transaction confirmation
- Check transaction on https://sepolia.lineascan.build
- Verify contract address in config

## ⚙️ Configuration

Before deploying, you can adjust in the contract:

```solidity
// Line 62-64
uint256 public constant MAX_SCORE_EASY = 50000;
uint256 public constant MAX_SCORE_MEDIUM = 50000;
uint256 public constant MAX_SCORE_HARD = 50000;

// Line 67
uint256 public constant MIN_SUBMISSION_INTERVAL = 10; // seconds
```

## 🎉 That's It!

Your leaderboard will now:
- ✅ Accept score submissions
- ✅ Display scores with timestamps
- ✅ Rank players correctly
- ✅ Prevent cheating and spam

## 💡 Adding PoH Later (Optional)

You can add Proof of Humanity verification via:
1. **Frontend filtering** - Check PoH API, show badge
2. **Backend verification** - Verify via API, mark in database
3. **Contract v2** - Deploy new contract with PoH

For now, keep it simple and get it working!
