# terminal-screensavers

Beautiful terminal screensavers. No install required — just run:

```bash
npx terminal-screensavers
```

Or with Bun:

```bash
bunx terminal-screensavers
```

Press any key to exit.

## Screensavers

| Name | Description | FPS |
|---|---|---|
| `aquarium` | Fish, bubbles, and seaweed in an ASCII aquarium | 6 |
| `bonsai` | Procedurally growing bonsai tree | 6 |
| `bouncing-logo` | DVD-style bouncing text block with color changes | 15 |
| `digital-clock` | Large bouncing digital clock display | 10 |
| `dna-helix` | Rotating DNA double helix animation | 12 |
| `fire` | ASCII fire rising from the bottom of the screen | 15 |
| `fireworks` | Colorful firework rockets and explosions | 15 |
| `game-of-life` | Conway's Game of Life cellular automaton | 8 |
| `lava-lamp` | Colorful metaball lava lamp blobs | 10 |
| `matrix-rain` | Falling green katakana and latin characters | 12 |
| `maze` | Animated maze generation and solving | 15 |
| `mystify` | Bouncing geometric shapes like the Windows classic | 15 |
| `pipes` | Random pipe segments with box-drawing characters | 15 |
| `starfield` | 3D stars flying toward the viewer | 20 |

## Usage

```bash
# Random screensaver
terminal-screensavers

# Specific screensaver
terminal-screensavers matrix-rain

# List all screensavers
terminal-screensavers --list

# Override FPS
terminal-screensavers starfield --fps 30
```

## Adding a Screensaver

1. Create `src/screensavers/<name>.tsx` exporting a `ScreensaverModule`:

```tsx
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

function MyScreensaver({ columns, rows, frame, elapsed }: ScreensaverProps) {
  // render your screensaver
}

export const myScreensaver: ScreensaverModule = {
  name: "my-screensaver",
  description: "A short description",
  component: MyScreensaver,
  fps: 15,
};
```

2. Re-export from `src/screensavers/index.ts`
3. Add to the array in `src/registry.ts`

## Development

```bash
bun install
bun run dev              # run directly (no build step)
bun run dev matrix-rain  # run a specific screensaver
bun run build            # compile to dist/
bun run lint             # check with biome
bun run format           # auto-fix lint/format
```

## License

MIT
