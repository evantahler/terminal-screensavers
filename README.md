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
| `binary-rain` | <img src="screenshots/binary-rain.png" alt="binary-rain" width="150"> | Falling binary digits with embedded tech words and IP addresses |
| `boids` | <img src="screenshots/boids.png" alt="boids" width="150"> | Flocking simulation with boids that separate, align, and cohere |
| `bonsai` | <img src="screenshots/bonsai.png" alt="bonsai" width="150"> | Procedurally growing bonsai tree |
| `bouncing-logo` | <img src="screenshots/bouncing-logo.png" alt="bouncing-logo" width="150"> | DVD-style bouncing text block with color changes |
| `bubbles` | <img src="screenshots/bubbles.png" alt="bubbles" width="150"> | Rising bubbles that wobble and pop |
| `digital-clock` | <img src="screenshots/digital-clock.png" alt="digital-clock" width="150"> | Large bouncing digital clock display |
| `dna-helix` | <img src="screenshots/dna-helix.png" alt="dna-helix" width="150"> | Rotating DNA double helix animation |
| `fire` | <img src="screenshots/fire.png" alt="fire" width="150"> | ASCII fire rising from the bottom of the screen |
| `fireflies` | <img src="screenshots/fireflies.png" alt="fireflies" width="150"> | Glowing fireflies drifting and pulsing in the dark |
| `fireworks` | <img src="screenshots/fireworks.png" alt="fireworks" width="150"> | Colorful firework rockets and explosions |
| `flying-toasters` | <img src="screenshots/flying-toasters.png" alt="flying-toasters" width="150"> | Classic After Dark chrome toasters with flapping wings and toast |
| `game-of-life` | <img src="screenshots/game-of-life.png" alt="game-of-life" width="150"> | Conway's Game of Life cellular automaton |
| `gravity-wells` | <img src="screenshots/gravity-wells.png" alt="gravity-wells" width="150"> | Particles orbiting invisible gravity sources with colored trails |
| `kaleidoscope` | <img src="screenshots/kaleidoscope.png" alt="kaleidoscope" width="150"> | Symmetrical patterns reflected across multiple axes with morphing colors |
| `lava-lamp` | <img src="screenshots/lava-lamp.png" alt="lava-lamp" width="150"> | Colorful metaball lava lamp blobs |
| `lightning` | <img src="screenshots/lightning.png" alt="lightning" width="150"> | Procedural lightning bolts striking from storm clouds with bright flashes |
| `lissajous-figures` | <img src="screenshots/lissajous-figures.png" alt="lissajous-figures" width="150"> | Oscillating curves tracing Lissajous patterns with morphing frequency ratios |
| `mandelbrot-zoom` | <img src="screenshots/mandelbrot-zoom.png" alt="mandelbrot-zoom" width="150"> | Continuous zoom into the Mandelbrot set with colored ASCII |
| `matrix-rain` | <img src="screenshots/matrix-rain.png" alt="matrix-rain" width="150"> | Falling green katakana and latin characters |
| `maze` | <img src="screenshots/maze.png" alt="maze" width="150"> | Animated maze generation and solving |
| `maze-3d` | <img src="screenshots/maze-3d.png" alt="maze-3d" width="150"> | First-person walk through an endless maze |
| `mystify` | <img src="screenshots/mystify.png" alt="mystify" width="150"> | Bouncing geometric shapes like the Windows classic |
| `particle-system` | <img src="screenshots/particle-system.png" alt="particle-system" width="150"> | Particle emitters with gravity, wind, and multiple modes: fountain, explosion, rain, sparks |
| `perlin-noise-field` | <img src="screenshots/perlin-noise-field.png" alt="perlin-noise-field" width="150"> | Perlin noise visualized as characters of varying density with color gradients |
| `pipes` | <img src="screenshots/pipes.png" alt="pipes" width="150"> | Random pipe segments with box-drawing characters |
| `platformer` | <img src="screenshots/platformer.png" alt="platformer" width="150"> | Procedurally generated 2D platformer with jumping, enemies, and coins |
| `ripples` | <img src="screenshots/ripples.png" alt="ripples" width="150"> | Concentric ripples expanding like raindrops on a pond |
| `sand-simulation` | <img src="screenshots/sand-simulation.png" alt="sand-simulation" width="150"> | Falling sand particles that pile up and cascade with layered colors |
| `smoke` | <img src="screenshots/smoke.png" alt="smoke" width="150"> | Wispy smoke rising and dissipating with varying character density |
| `source-code-scroll` | <img src="screenshots/source-code-scroll.png" alt="source-code-scroll" width="150"> | Syntax-highlighted source code scrolling by like a Hollywood hacking scene |
| `starfield` | <img src="screenshots/starfield.png" alt="starfield" width="150"> | 3D stars flying toward the viewer |
| `tetris` | <img src="screenshots/tetris.png" alt="tetris" width="150"> | Auto-playing Tetris with falling pieces, line clears, and scoring |
| `ticker-tape` | <img src="screenshots/ticker-tape.png" alt="ticker-tape" width="150"> | Scrolling stock tickers and news headlines with color-coded prices |
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
