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

| Name | Screenshot | Description |
|---|---|---|
| `ant-colony` | <img src="screenshots/ant-colony.png" alt="ant-colony" width="150"> | Simulated ants leaving pheromone trails between nest and food |
| `aquarium` | <img src="screenshots/aquarium.png" alt="aquarium" width="150"> | Fish, bubbles, and seaweed in an ASCII aquarium |
| `aurora-borealis` | <img src="screenshots/aurora-borealis.png" alt="aurora-borealis" width="150"> | Shimmering curtains of northern lights with twinkling stars |
| `bonsai` | <img src="screenshots/bonsai.png" alt="bonsai" width="150"> | Procedurally growing bonsai tree |
| `bouncing-logo` | <img src="screenshots/bouncing-logo.png" alt="bouncing-logo" width="150"> | DVD-style bouncing text block with color changes |
| `bubbles` | <img src="screenshots/bubbles.png" alt="bubbles" width="150"> | Rising bubbles that wobble and pop |
| `digital-clock` | <img src="screenshots/digital-clock.png" alt="digital-clock" width="150"> | Large bouncing digital clock display |
| `dna-helix` | <img src="screenshots/dna-helix.png" alt="dna-helix" width="150"> | Rotating DNA double helix animation |
| `fire` | <img src="screenshots/fire.png" alt="fire" width="150"> | ASCII fire rising from the bottom of the screen |
| `fireworks` | <img src="screenshots/fireworks.png" alt="fireworks" width="150"> | Colorful firework rockets and explosions |
| `game-of-life` | <img src="screenshots/game-of-life.png" alt="game-of-life" width="150"> | Conway's Game of Life cellular automaton |
| `gravity-wells` | <img src="screenshots/gravity-wells.png" alt="gravity-wells" width="150"> | Particles orbiting invisible gravity sources with colored trails |
| `lava-lamp` | <img src="screenshots/lava-lamp.png" alt="lava-lamp" width="150"> | Colorful metaball lava lamp blobs |
| `mandelbrot-zoom` | <img src="screenshots/mandelbrot-zoom.png" alt="mandelbrot-zoom" width="150"> | Continuous zoom into the Mandelbrot set with colored ASCII |
| `matrix-rain` | <img src="screenshots/matrix-rain.png" alt="matrix-rain" width="150"> | Falling green katakana and latin characters |
| `maze` | <img src="screenshots/maze.png" alt="maze" width="150"> | Animated maze generation and solving |
| `mystify` | <img src="screenshots/mystify.png" alt="mystify" width="150"> | Bouncing geometric shapes like the Windows classic |
| `pipes` | <img src="screenshots/pipes.png" alt="pipes" width="150"> | Random pipe segments with box-drawing characters |
| `platformer` | <img src="screenshots/platformer.png" alt="platformer" width="150"> | Procedurally generated 2D platformer with jumping, enemies, and coins |
| `ripples` | <img src="screenshots/ripples.png" alt="ripples" width="150"> | Concentric ripples expanding like raindrops on a pond |
| `starfield` | <img src="screenshots/starfield.png" alt="starfield" width="150"> | 3D stars flying toward the viewer |
| `tower-of-hanoi` | <img src="screenshots/tower-of-hanoi.png" alt="tower-of-hanoi" width="150"> | Animated Tower of Hanoi puzzle solution |
| `tunnel` | <img src="screenshots/tunnel.png" alt="tunnel" width="150"> | Spiraling tunnel vortex zooming toward the viewer |

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
