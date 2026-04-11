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

**Bad** — each `setParticles` call triggers reconciliation:
```tsx
const [particles, setParticles] = useState<Particle[]>([]);
// Every frame: setParticles([...updated])
```

**Good** — mutate the ref, let the `frame` prop drive re-renders:
```tsx
const stateRef = useRef({ particles: [] as Particle[], grid: new Array(cols * rows) });
// Every frame: stateRef.current.particles.forEach(p => { p.x += p.vx; ... })
```

Also avoid `.filter()` in hot loops — it allocates a new array every frame. Prefer in-place compaction:

```tsx
// BAD: allocates new array every frame
state.particles = state.particles.filter(p => p.alive);

// GOOD: compact in place, no allocation
let write = 0;
for (let read = 0; read < state.particles.length; read++) {
  if (state.particles[read].alive) {
    state.particles[write++] = state.particles[read];
  }
}
state.particles.length = write;
```

## Minimize React element count

Each `<Text>` or `<Box>` element has overhead in Ink's reconciler and Yoga layout engine. Ink performs a full tree traversal and Yoga layout pass on every React state change — so fewer elements means a faster pipeline. Strategies:

- **Batch same-colored adjacent cells** into a single `<Text>` with a multi-character string
- **Use sparse rendering** for scenes that are mostly empty space
- **Avoid nested `<Text>` inside `<Text>`** — this causes React key warnings and extra reconciliation. Flat structures render faster.

### Merge adjacent same-colored cells in `renderSparseRow`

`renderSparseRow()` already groups empty cells into space strings, but creates a separate `<Text>` for every non-empty cell. For dense screensavers, adjacent cells often share the same color. Merging them into a single `<Text>` with a multi-character string can halve the element count:

```tsx
// Instead of: <Text color="red">█</Text><Text color="red">█</Text><Text color="red">█</Text>
// Produce:    <Text color="red">███</Text>
```

This optimization is already built into `renderSparseRow()` — it tracks the current color and accumulates characters until the color changes.

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

## Pre-allocate and reuse grid buffers

Creating new arrays every frame generates GC pressure. Allocate grid buffers once in a `useRef` and clear them each frame:

```tsx
const stateRef = useRef({
  grid: null as (SparseCell | null)[][] | null,
});

// In your render function:
const state = stateRef.current;
if (!state.grid || state.grid.length !== height || state.grid[0]?.length !== columns) {
  state.grid = Array.from({ length: height }, () => new Array(columns).fill(null));
}
// Clear each frame instead of re-creating
for (let y = 0; y < height; y++) {
  state.grid[y].fill(null);
}
```

For dense numeric data (heat maps, density fields, noise grids), use `Float32Array` for contiguous, cache-friendly memory with lower GC overhead:

```tsx
const buffer = useRef(new Float32Array(0));
if (buffer.current.length !== columns * height) {
  buffer.current = new Float32Array(columns * height);
}
// Access: buffer.current[y * columns + x]
```

## Object pooling for particle-heavy screensavers

Instead of creating new particle objects and filtering dead ones each frame, maintain a pool and recycle:

```tsx
interface Particle {
  alive: boolean;
  x: number; y: number; vx: number; vy: number;
}

// Pre-allocate pool
const pool: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
  alive: false, x: 0, y: 0, vx: 0, vy: 0,
}));

// Spawn: find a dead slot and reuse it
function spawn(x: number, y: number) {
  const p = pool.find(p => !p.alive);
  if (p) { p.alive = true; p.x = x; p.y = y; /* ... */ }
}

// Update: iterate all, skip dead — no allocation, no filter
for (const p of pool) {
  if (!p.alive) continue;
  p.x += p.vx;
  if (outOfBounds(p)) p.alive = false;
}
```

This eliminates per-frame array allocations in screensavers like fireworks, particle-system, and boids.

## Avoid double state updates in `useFrame`

If the frame hook calls multiple `setState` functions per tick, each one triggers a separate React reconciliation + Ink render pass. Combine related state into a single update:

```tsx
// BAD: two renders per frame
setFrame(f => f + 1);
setElapsed(Date.now() - startTime.current);

// GOOD: one render per frame
setState(s => ({ frame: s.frame + 1, elapsed: Date.now() - startTime.current }));
```

## Self-correcting timers for consistent frame timing

`setInterval` suffers from cumulative drift — each callback fires *at least* N ms after the previous one, so small delays accumulate. For timing-sensitive screensavers, use a self-correcting `setTimeout` pattern:

```tsx
function startLoop(fps: number, callback: () => void) {
  const interval = 1000 / fps;
  let expected = Date.now() + interval;

  function tick() {
    callback();
    const drift = Date.now() - expected;
    expected += interval;
    setTimeout(tick, Math.max(0, interval - drift));
  }
  setTimeout(tick, interval);
}
```

This compensates for drift each tick, keeping the average frame rate closer to the target. Most screensavers won't notice the difference, but it helps at higher FPS (20+) or when the event loop is under load.

## Clean up entity arrays to prevent memory growth

For screensavers with spawning/despawning entities (particles, bolts, rockets), filter out dead entities each frame to prevent unbounded array growth:

```tsx
state.bolts = state.bolts.filter(b => b.age < b.maxAge);
```

Without this, GC pauses will cause periodic frame drops.

## Resize handling

When `columns` or `rows` change, reinitialize state rather than trying to resize buffers in place. Terminal resize is rare enough that a fresh start is simpler and avoids subtle off-by-one bugs.

## Current optimization status

Most screensavers use `renderSparseRow()`. To check which ones don't, run:

```bash
grep -rL "renderSparseRow" src/screensavers/*.tsx | grep -v utils.tsx
```

### Known performance issues

- **`useFrame` hook** — calls `setFrame()` and `setElapsed()` separately, causing two React reconciliation passes per frame tick
- **`renderSparseRow`** — does not merge adjacent same-colored cells; creates a `<Text>` per non-empty cell even when neighbors share color+bold
