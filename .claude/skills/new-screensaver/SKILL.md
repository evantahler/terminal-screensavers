---
name: new-screensaver
description: Create a new terminal screensaver for this project
argument-hint: "<screensaver-name> [description of what it should look like]"
allowed-tools: Bash(bun *), Bash(bun run *), Read, Write, Edit, Glob, Grep
---

# New Screensaver

Create a new screensaver for the terminal-screensavers project. Follow these steps exactly.

## 1. Understand the request

The user will provide `$ARGUMENTS` with a screensaver name and optionally a description. Parse the name (kebab-case) and any visual/behavioral requirements.

## 2. Read existing code for reference

Before writing any code, read these files to understand the patterns:

- `src/types.ts` — the `ScreensaverModule` and `ScreensaverProps` interfaces
- `src/registry.ts` — how screensavers are registered
- `src/screensavers/utils.tsx` — shared utilities (`bounce`, `renderSparseRow`)
- At least one existing screensaver from `src/screensavers/` as a reference for the animation style needed

## 3. Create the screensaver file

Create `src/screensavers/<name>.tsx`. Every screensaver must follow this structure:

```tsx
import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

const MyScreensaver: React.FC<ScreensaverProps> = ({ columns, rows, frame, elapsed }) => {
  // Use useRef for mutable animation state (NOT useState)
  const stateRef = useRef<MyState>(initialState);

  // Update animation state each frame (mutate ref directly)
  // ...

  // Build a grid or use sparse rendering, then return JSX
  return (
    <Box flexDirection="column">
      {/* rows of <Text> elements */}
    </Box>
  );
};

export const myScreensaver: ScreensaverModule = {
  name: "my-screensaver",
  description: "Short description of the screensaver",
  component: MyScreensaver,
  fps: 15, // optional, default is 15
};
```

### Key rules

- **State**: Use `useRef` for all mutable animation state. Mutate the ref directly each render — do NOT use `useState` for animation data (it causes unnecessary re-renders; the `frame` prop already drives re-renders).
- **Props**: `columns` = terminal width, `rows` = terminal height, `frame` = incrementing frame counter, `elapsed` = ms since mount.
- **Grid size**: Use `rows - 1` for content height to avoid overflow. Always bounds-check: `if (x >= 0 && x < columns && y >= 0 && y < rows)`.
- **Rendering**: Two patterns are used in this codebase:
  - **Grid-based**: Build a 2D array `grid[y][x]`, populate cells with `{ char, color }`, render row-by-row with `<Text>` per cell. Best for dense or overlapping content.
  - **Sparse**: Use `renderSparseRow()` from `utils.tsx` for screensavers with mostly empty space. Groups consecutive spaces into single text nodes for performance.
- **Colors**: Use hex strings (`"#ff4444"`) for dynamic colors. Ink also accepts named colors (`"red"`, `"green"`).
- **Animation**: Use `frame` to drive animation timing. For physics, accumulate velocity/position in the ref state each frame. For step-based animation, use a frame counter to pace transitions.
- **Looping**: Screensavers should run indefinitely. When a cycle completes (e.g., puzzle solved, pattern fills screen), reset and start a new variation.
- **Export name**: Use camelCase matching the kebab-case file name (e.g., `tower-of-hanoi.tsx` exports `towerOfHanoi`).

## 4. Register the screensaver

Edit `src/registry.ts`:
1. Add an import: `import { myScreensaver } from "./screensavers/my-screensaver.js";`
2. Add to the `screensavers` array in alphabetical order by name.

## 5. Update the README

Edit `README.md` and add a row to the screensavers table in alphabetical order:

```markdown
| `<name>` | <img src="screenshots/<name>.png" alt="<name>" width="150"> | Short description | FPS |
```

Use the description and fps from the `ScreensaverModule` export.

## 6. Bump the version

Edit `package.json` and increment the minor version (e.g., `0.4.0` -> `0.5.0`). New screensavers are always a minor bump.

## 7. Verify

Run these commands and fix any issues:

```bash
bun biome check --write src/
bun run build
bun run dev <screensaver-name>
```

The screensaver must:
- Compile with no TypeScript errors
- Pass biome lint/format checks
- Render without crashing when run
- Look visually correct and animate smoothly

## 8. Capture screenshot

Run the screenshot capture script:

```bash
bun run screenshots <screensaver-name>
```

This renders the screensaver headlessly (no GUI needed) and saves a PNG to `screenshots/`. The script imports the screensaver list from the registry, so no manual list maintenance is needed.

When run without a name, the script only captures screensavers that are missing screenshots. Use `--all` to recapture everything.

Until the screenshot is captured, `bun test` will report a failing test for the missing PNG file.

## Reference screensavers by complexity

Pick a reference screensaver to read based on what you're building:

| Complexity | Example | Pattern |
|---|---|---|
| Simple movement | `bouncing-logo.tsx` | Single entity, bounce physics, sparse rendering |
| Particle system | `starfield.tsx` | Many entities, 3D projection, depth-based styling |
| Streaming/columns | `matrix-rain.tsx` | Per-column state, character cycling, brightness gradient |
| Cellular automata | `fire.tsx`, `game-of-life.tsx` | 2D buffer, neighbor-based updates |
| Multi-phase animation | `tower-of-hanoi.tsx` | State machine with animation phases |
| Multi-entity lifecycle | `fireworks.tsx` | Entity pools, spawn/despawn, gravity |
| Growing structure | `bonsai.tsx` | Incremental drawing, branching logic |
