# Multiplayer Testing Guide

## Quick Start

### Prerequisites
- Two browsers or two machines
- Wallet extensions (MetaMask, Rainbow, etc.) - can use same wallet in both
- Node.js 18+

### Setup

1. **Terminal 1: Start Backend**
```bash
cd server
npm install  # if first time
npm run dev
# Output: Game Server running on port 3001
```

2. **Terminal 2: Start Frontend**
```bash
npm install  # if first time
npm run dev
# Output: ▲ Next.js running on http://localhost:3000
```

3. **Open Two Browsers**
- Browser 1: `http://localhost:3000`
- Browser 2: `http://localhost:3000`

---

## Test Scenarios

### Scenario 1: Basic Game Flow (2 Players)

**Browser 1:**
1. Click "🎯 Solo Practice" → click "Solo Competitor" (change mind)
2. Click "👥 Multiplayer" (now enabled!)
3. Confirm: 2 players, MEDIUM difficulty, 0.1 USDC stake
4. Click "Start Game"
5. See: Game in WAITING state, "Join Game" button visible
6. **Click "Join Game"**
7. See: Game transitions to ACTIVE
8. See: Player 1 (you) has blue "TURN" badge
9. 30s timer appears in center of screen

**Browser 2:**
1. Click "👥 Multiplayer"
2. Same settings as Browser 1 (2 players, MEDIUM, 0.1 USDC)
3. Click "Start Game"
4. See: Game state shows 1 player already joined
5. **Click "Join Game"**
6. See: You're now in ACTIVE game
7. See: Player 2 (you) receives turn
8. See: Player 1 now in spectator mode with overlay

**Expected Behavior:**
- ✅ Timer shows 30s countdown
- ✅ Only active player can drag blocks
- ✅ Other player sees spectator overlay with current player name
- ✅ When timer expires, turns auto-advance
- ✅ Physics updates visible to both (smooth block movement)

---

### Scenario 2: Spectator Mode (Not Your Turn)

**While Browser 2 is taking a turn (Browser 1 is spectating):**

1. Browser 1 should see:
   - `SpectatorOverlay` showing "CURRENT TURN"
   - Browser 2's wallet address displayed
   - 30s countdown timer
   - List of remaining players below

2. Try to drag a block in Browser 1:
   - **Should fail** - input blocked
   - Hand cursor should change
   - No physics interaction

3. Watch Browser 2's actions:
   - Browser 2 drags blocks
   - Physics updates appear in real-time in Browser 1
   - Blocks fall and respond to physics

---

### Scenario 3: Turn Timer Auto-Advance

**During any turn:**

1. **Don't move** - just watch the timer
2. Timer counts down from 30s
3. When it reaches 0:
   - `endTurn()` is called on server
   - Current player index increments
   - New `turnChanged` event sent
   - **Turn switches to other player**
   - Other player's "TURN" badge appears
   - Previous player enters spectator mode

4. Timer resets to 30s for new player

---

### Scenario 4: Tower Collapse

**Intentionally trigger a collapse:**

1. Active player drags **many blocks rapidly**
2. Try to topple the tower completely
3. When >40% of blocks fall below Y=0.5:
   - Server detects collapse
   - Status changes to "COLLAPSED"
   - Both browsers show `MultiplayerGameOver` modal

4. Game Over screen shows:
   - 🏚️ "TOWER COLLAPSED!" banner
   - Survivor list with medals (🥇🥈🥉)
   - Prize pool: `$X.XX USDC`
   - Winner information
   - "Play Again" and "Back to Menu" buttons

---

### Scenario 5: Player Disconnect (Advanced)

**Browser 1:**
1. In middle of game, **close the browser**
2. Game continues for Browser 2

**Browser 2:**
1. See: Player 1 disappears from player list
2. If it was Player 1's turn, auto-advance to Browser 2
3. Game continues with remaining player
4. Eventually reaches 1 player = game ends

---

## Debug Mode (Server Console)

Watch the server terminal to verify state transitions:

```
Client connected: SkN8...          # Socket connection
Creating game with config: {...}    # Game creation
Game created with ID: 1733...       # Game initialized
Player joining: 0x123... with socket: SkN8...  # Player 1 joins
Turn started for 0x123...           # Turn 1 begins
Move applied for 0x123...           # Block moved
Turn timeout - advancing to next player  # 30s elapsed
Turn started for 0x456...           # Turn 2 begins
Collapse Detected!                  # >40% fallen
```

---

## Troubleshooting

### Issue: "Game shows WAITING, join button doesn't work"
**Fix:**
- Wallet must be connected (rainbow kit button)
- Check browser console for Socket.io errors
- Restart server: `npm run dev` in server/

### Issue: "Can't drag blocks even on my turn"
**Fix:**
- Check GameUI shows your address in player list with "TURN" badge
- Verify `isCurrentPlayer` in Console: 
  ```javascript
  // Browser DevTools:
  // Should show true when it's your turn
  ```
- Clear cache and refresh

### Issue: "Blocks don't move when I drag"
**Fix:**
- Is status "ACTIVE"? (Check top-right status box)
- Is it your turn? (Check blue "TURN" badge)
- Try dragging from center of block
- Check server logs for "Move applied"

### Issue: "Other player's blocks don't update"
**Fix:**
- Physics loop might be paused
- Check server terminal: "Physics Loop" running?
- Check network tab: `physicsUpdate` events coming in?

### Issue: "Game stuck on WAITING after 2nd player joins"
**Fix:**
- Server should auto-transition to ACTIVE when 2+ join
- Check server logs for "Turn started"
- Restart server if needed

---

## Expected Performance

### Latency
- Turn messages: <100ms
- Physics updates: 60 FPS (16.67ms per frame)
- Block drag → other player sees: ~50-100ms

### Network Usage
- Per physics frame: ~2-4KB (48 blocks × 4 floats)
- Per turn change: ~200 bytes
- Total: ~240KB per game minute

### CPU/Memory
- Server: <5% CPU on single game
- Client: ~20-30% CPU (Three.js rendering)
- Memory: ~50-100MB per client

---

## Success Criteria

✅ Multiplayer MVP is working when:

1. **Join Flow**
   - [ ] Create game with 2 players
   - [ ] Player 1 joins, game WAITING
   - [ ] Player 2 joins, game ACTIVE
   - [ ] Turn starts automatically

2. **Active Turn**
   - [ ] Only active player can drag blocks
   - [ ] Physics updates 60 FPS to both
   - [ ] Timer shows 30s countdown

3. **Turn Switching**
   - [ ] Timer expires → auto-advance to next player
   - [ ] Spectator overlay shows for inactive players
   - [ ] Input blocked for spectators

4. **Collapse**
   - [ ] Drag many blocks down
   - [ ] >40% fallen → `COLLAPSED` state
   - [ ] Game over modal shows survivor

5. **Robustness**
   - [ ] Both players see same physics
   - [ ] No crashes on disconnect
   - [ ] Smooth 60 FPS gameplay

---

## Next Steps After Testing

If all tests pass:
1. Deploy to testnet
2. Test with real wallets on Linea Sepolia
3. Add smart contract pot distribution
4. Optimize physics broadcast (delta updates)
5. Add leaderboards and tournament mode

---

**Test Date:** _______________  
**Tester:** _______________  
**Result:** ✅ Pass / ⚠️ Issues Found  

Issues Found:
```
[List any bugs or unexpected behavior]
```
