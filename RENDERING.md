# Rendering Performance Tips

Tips for keeping screensavers smooth as scene complexity grows. Read this before building anything with dense grids, many particles, or accumulating state.

## Use `renderSparseRow()` instead of per-cell `<Text>` elements

Rendering each cell as its own `<Text>` component creates thousands of React elements. `renderSparseRow()` from `src/screensavers/utils.tsx` groups consecutive empty cells into single space strings and only creates `<Text>` nodes for visible characters. This dramatically reduces the React tree size.

**Bad** — O(width) React elements per row:
```tsx
row.map((cell, x) => <Text key={x} color={cell.color}>{cell.char}</Text>)
```

**Good** — grouped spans, far fewer elements:
```tsx
import { renderSparseRow } from "./utils.js";
renderSparseRow(sparseRow, y);
```

## Never render empty cells as `<Text>` elements

A common mistake is rendering spaces as explicit `<Text>` nodes. This defeats sparse rendering entirely:

**Bad** — spaces are full React elements:
```tsx
cell ? <Text color={cell.color}>{cell.char}</Text> : <Text> </Text>
```

**Good** — spaces are bare strings, only visible cells become React elements:
```tsx
renderSparseRow(row.map(cell => cell ? { char: cell.char, color: cell.color } : null), y)
```

## Freeze static regions

When parts of the scene stop changing, skip them in both the simulation loop and the render-data build:

1. Track a boundary (e.g., `frozenY`) that separates active from static regions
2. Cache the `SparseCell[]` arrays for frozen rows so you never rebuild them
3. Limit your physics/update loop to only iterate over the active region

This keeps per-frame cost proportional to what's actually moving, not the total grid size. Without this, screensavers with accumulating state will bog down as the screen fills.

Freezing applies beyond simple geometry — any region whose state won't change again qualifies:
- **Sand/snow:** full rows at the bottom
- **Tetris:** settled pieces below the active block
- **Maze:** completed rows during generation
- **Pipes:** all cells except the few being drawn each frame
- **Bonsai:** completed branches that no longer grow
- **Platformer:** static ground below the action

## Avoid `useState` for animation state

React's `useState` triggers a reconciliation pass on every update. Since the `frame` prop already drives re-renders, store all mutable animation state in `useRef` and mutate it directly. This avoids double-renders and keeps the update path simple.

## Minimize React element count

Each `<Text>` or `<Box>` element has overhead in Ink's reconciler. Strategies:

- **Batch same-colored adjacent cells** into a single `<Text>` with a multi-character string
- **Use sparse rendering** for scenes that are mostly empty space
- **Avoid nested `<Text>` inside `<Text>`** — this causes React key warnings and extra reconciliation. Flat structures render faster.

## Size the grid to `rows - 1`

Always use `rows - 1` for content height. The terminal's last row often triggers a scroll if written to, causing visual glitches.

## Use lookup tables (LUTs) for expensive per-pixel math

When rendering effects that require trigonometry, sqrt, or other expensive per-pixel calculations, precompute a lookup table once and reuse it every frame. Recompute only on terminal resize.

```tsx
// Precompute once (or on resize)
if (state.lutCols !== columns || state.lutRows !== height) {
  state.lut = new Array(columns * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < columns; x++) {
      const dx = x - cx, dy = y - cy;
      state.lut[y * columns + x] = {
        angle: Math.atan2(dy, dx),
        distance: Math.sqrt(dx * dx + dy * dy),
      };
    }
  }
}

// Reuse every frame — just index into the LUT
const entry = state.lut[y * columns + x];
```

See `tunnel.tsx` for a complete example.

## Cache expensive color conversions

Functions like `hslToHex()` called thousands of times per frame add up. If the same inputs repeat (e.g., a fixed palette, or quantized hue values), cache the results:

- Build a lookup map keyed by the input values
- Store it in `useRef` so it persists across frames
- Only recompute when inputs actually change

## Correct for terminal aspect ratio in physics

Terminal characters are roughly twice as tall as they are wide. When doing distance or angle calculations for physics, apply a 2:1 correction factor:

```tsx
const dx = (x - centerX) * 0.5; // or multiply Y by 2
const dy = y - centerY;
```

Without this, circles look like ellipses and diagonal movement looks wrong.

## Seed initial state for immediate visual feedback

Don't start with an empty screen. Spawn initial entities so the first frame has something visible:

```tsx
// fireworks.tsx pattern — seed a few rockets on init
for (let i = 0; i < 3; i++) {
  state.rockets.push(createRocket(columns, rows));
}
```

## Avoid deep clones in simulation logic

When testing placements or running AI lookahead, avoid cloning entire grids with `.map(row => row.map(cell => ({...cell})))`. Instead:

- Copy only the cells you need to test
- Use a "dirty" flag array to track and undo changes
- For collision detection, check cells in-place without copying

## Clean up entity arrays to prevent memory growth

For screensavers with spawning/despawning entities (particles, bolts, rockets), filter out dead entities each frame to prevent unbounded array growth:

```tsx
state.bolts = state.bolts.filter(b => b.age < b.maxAge);
```

Without this, GC pauses will cause periodic frame drops.

## Resize handling

When `columns` or `rows` change, reinitialize state rather than trying to resize buffers in place. Terminal resize is rare enough that a fresh start is simpler and avoids subtle off-by-one bugs.

## Current optimization status

Screensavers already using `renderSparseRow()`: binary-rain, boids, bubbles, fireworks, flying-toasters, gravity-wells, lightning, mandelbrot-zoom, mystify, perlin-noise-field, ripples, sand-simulation, starfield, ticker-tape, tunnel.

Screensavers still using per-cell `<Text>` that should be migrated: ant-colony, aquarium, aurora-borealis, bonsai, dna-helix, fire, lava-lamp, matrix-rain, platformer, tetris, tower-of-hanoi. Smoke reimplements sparse logic inline instead of importing `renderSparseRow()`.
