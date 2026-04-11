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
| `ant-colony` | <img src="screenshots/ant-colony.png" alt="ant-colony" width="150"> | Simulated ants leaving pheromone trails between nest and food | 15 |
| `aquarium` | <img src="screenshots/aquarium.png" alt="aquarium" width="150"> | Fish, bubbles, and seaweed in an ASCII aquarium | 6 |
| `aurora-borealis` | <img src="screenshots/aurora-borealis.png" alt="aurora-borealis" width="150"> | Shimmering curtains of northern lights with twinkling stars | 12 |
| `bonsai` | <img src="screenshots/bonsai.png" alt="bonsai" width="150"> | Procedurally growing bonsai tree | 6 |
| `bouncing-logo` | <img src="screenshots/bouncing-logo.png" alt="bouncing-logo" width="150"> | DVD-style bouncing text block with color changes | 15 |
| `bubbles` | <img src="screenshots/bubbles.png" alt="bubbles" width="150"> | Rising bubbles that wobble and pop | 15 |
| `digital-clock` | <img src="screenshots/digital-clock.png" alt="digital-clock" width="150"> | Large bouncing digital clock display | 10 |
| `dna-helix` | <img src="screenshots/dna-helix.png" alt="dna-helix" width="150"> | Rotating DNA double helix animation | 12 |
| `fire` | <img src="screenshots/fire.png" alt="fire" width="150"> | ASCII fire rising from the bottom of the screen | 15 |
| `fireworks` | <img src="screenshots/fireworks.png" alt="fireworks" width="150"> | Colorful firework rockets and explosions | 15 |
| `game-of-life` | <img src="screenshots/game-of-life.png" alt="game-of-life" width="150"> | Conway's Game of Life cellular automaton | 8 |
| `lava-lamp` | <img src="screenshots/lava-lamp.png" alt="lava-lamp" width="150"> | Colorful metaball lava lamp blobs | 10 |
| `mandelbrot-zoom` | <img src="screenshots/mandelbrot-zoom.png" alt="mandelbrot-zoom" width="150"> | Continuous zoom into the Mandelbrot set with colored ASCII | 8 |
| `matrix-rain` | <img src="screenshots/matrix-rain.png" alt="matrix-rain" width="150"> | Falling green katakana and latin characters | 12 |
| `maze` | <img src="screenshots/maze.png" alt="maze" width="150"> | Animated maze generation and solving | 15 |
| `mystify` | <img src="screenshots/mystify.png" alt="mystify" width="150"> | Bouncing geometric shapes like the Windows classic | 15 |
| `pipes` | <img src="screenshots/pipes.png" alt="pipes" width="150"> | Random pipe segments with box-drawing characters | 15 |
| `ripples` | <img src="screenshots/ripples.png" alt="ripples" width="150"> | Concentric ripples expanding like raindrops on a pond | 18 |
| `starfield` | <img src="screenshots/starfield.png" alt="starfield" width="150"> | 3D stars flying toward the viewer | 20 |
| `tower-of-hanoi` | <img src="screenshots/tower-of-hanoi.png" alt="tower-of-hanoi" width="150"> | Animated Tower of Hanoi puzzle solution | 30 |
| `tunnel` | <img src="screenshots/tunnel.png" alt="tunnel" width="150"> | Spiraling tunnel vortex zooming toward the viewer | 15 |

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
