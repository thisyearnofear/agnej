# UX Polish Implementation Plan

Based on design review of `remix-3d-jenga-tower-game`. Most infrastructure already exists
(`towerAnimations.ts`, `textures.ts`, `Toast.tsx`, `useToast.ts`). This plan covers the
remaining gaps. Aligned with Core Principles: ENHANCEMENT FIRST, CONSOLIDATION, DRY.

---

## Status Legend

- ✅ Done
- 🔲 Pending

---

## Already Complete

| Item | File | Detail |
|------|------|--------|
| ✅ Toast dismiss fix | `Game.tsx:930` | Connected `dismissToast` callback |
| ✅ Timer warning at 8s | `Game.tsx:629` | Changed from 10s to 8s |
| ✅ Tower sway | `Game.tsx:527-531` | `sin(time * 0.3)` per block |
| ✅ Wobble animation | `Game.tsx:534-541` | Decaying sine on block pull |
| ✅ Hover highlighting | `Game.tsx:656-687` | Yellow emissive + pointer/not-allowed cursor |
| ✅ Procedural textures | `Game.tsx:457-488` | Wood + plywood canvas textures |
| ✅ Toast system | `Toast.tsx` + `useToast.ts` | Bottom-center auto-dismiss |

---

## Section A — Parallel Work (User)

These are isolated to `GameUI.tsx` and the file system. No dependency on Section B.

### A1: Player Color System — `GameUI.tsx`

Define a color palette and map each player to a distinct color:

```tsx
const PLAYER_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#a855f7', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
] as const
```

Usage: `const playerColor = PLAYER_COLORS[index % PLAYER_COLORS.length]`

### A2: Active Player Glow — `GameUI.tsx:232-242`

Current player list row styling:
```tsx
// BEFORE
className={`... ${player.isCurrentTurn ? "bg-white/10 border border-yellow-500/50" : "bg-white/5"}`}
```

Enhanced with per-player color + glow:
```tsx
// AFTER
className={`... ${player.isCurrentTurn
  ? "bg-white/10 border-2 animate-pulse"
  : "bg-white/5 border border-white/10"}`}
style={player.isCurrentTurn ? {
  borderColor: playerColor,
  boxShadow: `0 0 12px ${playerColor}66, 0 0 4px ${playerColor}33`
} : undefined}
```

Also change the status dot from generic green/red to player-specific color when alive:
```tsx
<span className={`w-2 h-2 rounded-full ${player.isAlive ? "" : "bg-red-500"}`}
  style={player.isAlive ? { backgroundColor: playerColor } : undefined} />
```

### A3: Centered Title — `GameUI.tsx`

Add inside the top-level container `<div>`, between the Top Bar and Center Timer:
```tsx
{/* Centered Title */}
<div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
  <h1 className="text-2xl md:text-3xl font-black tracking-widest text-white/80"
    style={{ textShadow: '0 0 20px rgba(255,255,255,0.15)' }}>
    AGNEJ
  </h1>
</div>
```

### A4: Timer Red at 8s — `GameUI.tsx:210,214`

Current thresholds use `<= 10`. Change to `<= 8`:
```tsx
// Line 210 — text color
timeLeft <= 8 ? "text-red-500 animate-pulse" : "text-white"

// Line 214 — bar color
timeLeft <= 8 ? "bg-red-500" : "bg-blue-400"
```

### A5: Cleanup — Delete Unused Files ✅

```bash
# Re-export lines removed from physicsHelpers.ts
# Unused abstraction (not imported anywhere, duplicates Game.tsx logic)
rm src/lib/physicsEngine.ts

# Duplicate physi.js files (already exist in public/js/)
rm public/physi.js
rm public/physijs_worker.js
```

---

## Section B — Parallel Work (Kilo)

These are isolated to `Game.tsx` render/texture logic. No dependency on Section A.

### B1: Third Material Variation — `Game.tsx:468-477` ✅

Add a third plywood texture seed and distribute across blocks in `createTower`:

1. After line 488 (locked block material), add a third variant:
```tsx
const plywoodCanvas2 = generatePlywoodTexture({ seed: 13 })
const plywoodTexture2 = new THREE.CanvasTexture(plywoodCanvas2)
plywoodTexture2.wrapS = plywoodTexture2.wrapT = THREE.RepeatWrapping
plywoodTexture2.repeat.set(1, .5)

engine.materials.block2 = Physijs.createMaterial(
  new THREE.MeshLambertMaterial({ map: plywoodTexture2 }),
  physicsConfig.friction,
  physicsConfig.restitution
)
```

2. In `createTower` (~line 576), cycle materials:
```tsx
const mats = [engine.materials.block, engine.materials.block2]
// Then in the inner loop:
const matIndex = (i * 3 + j) % mats.length
const currentMat = isLocked ? lMat : mats[matIndex]
```

3. Add `block2` to the engineRef type definition at line 196.

---

## Verification

After all items complete:

```bash
npm run lint
npm run build   # or npx tsc --noEmit if no build script
```

---

## Dependency Graph

```
Section A (User)          Section B (Kilo)
─────────────────         ─────────────────
A1 Player colors          B1 Texture variation
A2 Active glow       ←──→ (no dependency)
A3 Centered title
A4 Timer 8s threshold
A5 Cleanup files
```

Both sections touch different files/regions and can proceed simultaneously.
Merge conflict risk: near zero (different line ranges in GameUI.tsx vs Game.tsx).
