# CLAUDE.md

## Commands

- `bun run dev` — Run screensavers directly (no build step needed)
- `bun run dev <name>` — Run a specific screensaver (e.g., `bun run dev matrix-rain`)
- `bun run dev --list` — List all available screensavers
- `bun run build` — Compile TypeScript to `dist/` via tsc
- `bun run rebuild` — Clean `dist/` and recompile
- `bun run lint` — Check code with Biome
- `bun run format` — Auto-fix lint/format issues with Biome

## Architecture

- **Framework:** Ink (React for CLI) + meow (arg parsing)
- **Entry point:** `src/cli.tsx` — parses args, selects screensaver, renders `<App>`
- **App.tsx:** Wires hooks together (fullscreen, frame loop, screen size), exits on any keypress
- **Hooks:** `useFullScreen` (alt screen buffer), `useFrame` (tick loop), `useScreenSize` (reactive terminal dims)
- **Screensavers:** Each exports a `ScreensaverModule` with name, description, component, and optional fps
- **Registry:** `src/registry.ts` imports all screensavers for random selection and `--list`

## Adding a Screensaver

1. Create `src/screensavers/<name>.tsx` exporting a `ScreensaverModule`
2. Re-export from `src/screensavers/index.ts`
3. Add to the array in `src/registry.ts`
