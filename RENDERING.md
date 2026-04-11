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

## Freeze static regions

When parts of the scene stop changing (e.g., full rows in a sand simulation, completed sections of a maze, settled particles), skip them in both the simulation loop and the render-data build:

1. Track a boundary (e.g., `frozenY`) that separates active from static regions
2. Cache the `SparseCell[]` arrays for frozen rows so you never rebuild them
3. Limit your physics/update loop to only iterate over the active region

This keeps per-frame cost proportional to what's actually moving, not the total grid size. Without this, screensavers with accumulating state (sand, snow, tetris-like stacking) will bog down as the screen fills.

## Avoid `useState` for animation state

React's `useState` triggers a reconciliation pass on every update. Since the `frame` prop already drives re-renders, store all mutable animation state in `useRef` and mutate it directly. This avoids double-renders and keeps the update path simple.

## Minimize React element count

Each `<Text>` or `<Box>` element has overhead in Ink's reconciler. Strategies:

- **Batch same-colored adjacent cells** into a single `<Text>` with a multi-character string
- **Use sparse rendering** for scenes that are mostly empty space
- **Avoid nested `<Text>` inside `<Text>`** — this causes React key warnings and extra reconciliation. Flat structures render faster.

## Size the grid to `rows - 1`

Always use `rows - 1` for content height. The terminal's last row often triggers a scroll if written to, causing visual glitches.

## Resize handling

When `columns` or `rows` change, reinitialize state rather than trying to resize buffers in place. Terminal resize is rare enough that a fresh start is simpler and avoids subtle off-by-one bugs.
