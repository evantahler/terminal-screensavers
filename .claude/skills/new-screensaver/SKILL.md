---
name: new-screensaver
description: Create a new terminal screensaver for this project
argument-hint: "<screensaver-name> [description or URL]"
allowed-tools: Bash(bun *), Bash(bun run *), Bash(gh issue view *), Bash(gh pr view *), Bash(git branch *), Read, Write, Edit, Glob, Grep, WebFetch, ExitPlanMode
---

# New Screensaver

Create a new screensaver for the terminal-screensavers project. Follow these steps exactly.

## 0. Exit plan mode

If you are currently in plan mode, exit it now using the `ExitPlanMode` tool before proceeding. You need to be in act mode to create files, edit code, and run commands.

## 1. Understand the request

The user will provide `$ARGUMENTS` with a screensaver name and optionally a description or a URL.

**If `$ARGUMENTS` contains a URL** (starts with `http://` or `https://`):

For **GitHub issue/PR URLs** (matching `github.com/<owner>/<repo>/issues/<number>` or `.../pull/<number>`):
1. Use `gh issue view <url>` or `gh pr view <url>` to fetch the content — this is more reliable than WebFetch for GitHub.
2. Extract the screensaver name, visual/behavioral requirements, and any other details from the issue/PR body.

For **all other URLs**:
1. Fetch the URL using the `WebFetch` tool to retrieve its content.
2. The URL may point to a design doc, a blog post, or any page describing the desired screensaver.
3. Extract from the fetched content: the screensaver name (convert to kebab-case), visual/behavioral requirements, and any other relevant details.

In both cases, if the content does not include a clear screensaver name, derive one from the description or ask the user.

**If `$ARGUMENTS` is just text** (no URL):
Parse the name (kebab-case) and any visual/behavioral requirements as before.

In either case, you should end up with a kebab-case name and a clear understanding of what the screensaver should look like and how it should animate.

## 2. Verify git branch name

Check that the current git branch name contains the screensaver name (kebab-case). For example, if the screensaver is `my-screensaver`, the branch should contain `my-screensaver` (e.g., `evantahler/my-screensaver` or `add-my-screensaver`).

If the branch name does **not** contain the screensaver name, rename it:

```bash
git branch -m <current-branch> evantahler/<screensaver-name>
```

This ensures the branch is identifiable when creating a PR later.

## 3. Read existing code for reference

Before writing any code, read these files to understand the patterns:

- `src/types.ts` — the `ScreensaverModule` and `ScreensaverProps` interfaces
- `src/registry.ts` — how screensavers are registered
- `src/screensavers/utils.tsx` — shared utilities (`bounce`, `renderSparseRow`)
- `RENDERING.md` — performance tips for dense grids, freezing static regions, sparse rendering
- At least one existing screensaver from `src/screensavers/` as a reference for the animation style needed

## 4. Create the screensaver file

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

## 5. Register the screensaver

Edit `src/registry.ts`:
1. Add an import: `import { myScreensaver } from "./screensavers/my-screensaver.js";`
2. Add to the `screensavers` array in alphabetical order by name.

## 6. Update the README

Edit `README.md` and add a row to the screensavers table in alphabetical order:

```markdown
| `<name>` | <img src="screenshots/<name>.png" alt="<name>" width="150"> | Short description |
```

Use the description from the `ScreensaverModule` export.

## 7. Bump the version

Edit `package.json` and increment the minor version (e.g., `0.4.0` -> `0.5.0`). New screensavers are always a minor bump.

## 8. Verify

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

## 9. Capture screenshot

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
