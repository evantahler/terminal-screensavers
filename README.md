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

| Name | Screenshot | Description | FPS |
|---|---|---|---|
| `aquarium` | ![aquarium](screenshots/aquarium.png) | Fish, bubbles, and seaweed in an ASCII aquarium | 6 |
| `bonsai` | ![bonsai](screenshots/bonsai.png) | Procedurally growing bonsai tree | 6 |
| `bouncing-logo` | ![bouncing-logo](screenshots/bouncing-logo.png) | DVD-style bouncing text block with color changes | 15 |
| `digital-clock` | ![digital-clock](screenshots/digital-clock.png) | Large bouncing digital clock display | 10 |
| `dna-helix` | ![dna-helix](screenshots/dna-helix.png) | Rotating DNA double helix animation | 12 |
| `fire` | ![fire](screenshots/fire.png) | ASCII fire rising from the bottom of the screen | 15 |
| `fireworks` | ![fireworks](screenshots/fireworks.png) | Colorful firework rockets and explosions | 15 |
| `game-of-life` | ![game-of-life](screenshots/game-of-life.png) | Conway's Game of Life cellular automaton | 8 |
| `lava-lamp` | ![lava-lamp](screenshots/lava-lamp.png) | Colorful metaball lava lamp blobs | 10 |
| `matrix-rain` | ![matrix-rain](screenshots/matrix-rain.png) | Falling green katakana and latin characters | 12 |
| `maze` | ![maze](screenshots/maze.png) | Animated maze generation and solving | 15 |
| `mystify` | ![mystify](screenshots/mystify.png) | Bouncing geometric shapes like the Windows classic | 15 |
| `pipes` | ![pipes](screenshots/pipes.png) | Random pipe segments with box-drawing characters | 15 |
| `starfield` | ![starfield](screenshots/starfield.png) | 3D stars flying toward the viewer | 20 |

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
