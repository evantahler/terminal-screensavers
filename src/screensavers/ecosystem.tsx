import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

enum Cell {
  Empty = 0,
  Grass = 1,
  Prey = 2,
  Predator = 3,
}

interface Organism {
  energy: number;
}

interface EcoState {
  grid: Cell[][];
  organisms: (Organism | null)[][];
  width: number;
  height: number;
  generation: number;
}

const GRASS_REGROW_CHANCE = 0.03;
const PREY_BREED_ENERGY = 6;
const PREY_INITIAL_ENERGY = 4;
const PREDATOR_BREED_ENERGY = 8;
const PREDATOR_INITIAL_ENERGY = 6;

function createState(width: number, height: number): EcoState {
  const grid: Cell[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => {
      const r = Math.random();
      if (r < 0.4) return Cell.Grass;
      if (r < 0.46) return Cell.Prey;
      if (r < 0.48) return Cell.Predator;
      return Cell.Empty;
    }),
  );

  const organisms: (Organism | null)[][] = Array.from(
    { length: height },
    (_, y) =>
      Array.from({ length: width }, (_, x) => {
        if (grid[y][x] === Cell.Prey) return { energy: PREY_INITIAL_ENERGY };
        if (grid[y][x] === Cell.Predator)
          return { energy: PREDATOR_INITIAL_ENERGY };
        return null;
      }),
  );

  return { grid, organisms, width, height, generation: 0 };
}

// Reusable neighbor buffer to avoid allocations
const _nbuf: [number, number][] = [
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
];

/** Write valid neighbors into _nbuf, return count. Shuffled in-place. */
function fillNeighbors(x: number, y: number, w: number, h: number): number {
  let n = 0;
  if (y > 0) {
    _nbuf[n][0] = x;
    _nbuf[n][1] = y - 1;
    n++;
  }
  if (y < h - 1) {
    _nbuf[n][0] = x;
    _nbuf[n][1] = y + 1;
    n++;
  }
  if (x > 0) {
    _nbuf[n][0] = x - 1;
    _nbuf[n][1] = y;
    n++;
  }
  if (x < w - 1) {
    _nbuf[n][0] = x + 1;
    _nbuf[n][1] = y;
    n++;
  }
  // Fisher-Yates shuffle in place
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tx = _nbuf[i][0];
    const ty = _nbuf[i][1];
    _nbuf[i][0] = _nbuf[j][0];
    _nbuf[i][1] = _nbuf[j][1];
    _nbuf[j][0] = tx;
    _nbuf[j][1] = ty;
  }
  return n;
}

function step(state: EcoState): void {
  const { grid, organisms, width, height } = state;

  // Build creature list using flat indices, then shuffle
  const creatureIndices: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = grid[y][x];
      if (c === Cell.Prey || c === Cell.Predator) {
        creatureIndices.push(y * width + x);
      }
    }
  }
  // Fisher-Yates shuffle
  for (let i = creatureIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = creatureIndices[i];
    creatureIndices[i] = creatureIndices[j];
    creatureIndices[j] = tmp;
  }

  // Boolean array for moved tracking — no string allocations
  const moved = new Uint8Array(width * height);

  for (const idx of creatureIndices) {
    const ox = idx % width;
    const oy = (idx - ox) / width;
    const type = grid[oy][ox];

    if (type !== Cell.Prey && type !== Cell.Predator) continue;
    if (moved[idx]) continue;

    const org = organisms[oy][ox];
    if (!org) continue;

    const nCount = fillNeighbors(ox, oy, width, height);

    let cx = ox;
    let cy = oy;

    if (type === Cell.Prey) {
      // Find grass or empty neighbor
      let gi = -1;
      let ei = -1;
      for (let i = 0; i < nCount; i++) {
        const c = grid[_nbuf[i][1]][_nbuf[i][0]];
        if (gi < 0 && c === Cell.Grass) gi = i;
        if (ei < 0 && c === Cell.Empty) ei = i;
      }
      const ti = gi >= 0 ? gi : ei;

      if (ti >= 0) {
        const nx = _nbuf[ti][0];
        const ny = _nbuf[ti][1];
        const ateGrass = grid[ny][nx] === Cell.Grass;

        if (org.energy >= PREY_BREED_ENERGY) {
          grid[ny][nx] = Cell.Prey;
          organisms[ny][nx] = {
            energy: ateGrass ? PREY_INITIAL_ENERGY + 1 : PREY_INITIAL_ENERGY,
          };
          org.energy = PREY_INITIAL_ENERGY;
          moved[ny * width + nx] = 1;
        } else {
          grid[ny][nx] = Cell.Prey;
          organisms[ny][nx] = org;
          grid[oy][ox] = Cell.Empty;
          organisms[oy][ox] = null;
          org.energy += ateGrass ? 2 : -1;
          cx = nx;
          cy = ny;
          moved[ny * width + nx] = 1;
        }
      } else {
        org.energy -= 1;
      }
    } else {
      // Predator: find prey or empty/grass neighbor
      let pi = -1;
      let ei = -1;
      for (let i = 0; i < nCount; i++) {
        const c = grid[_nbuf[i][1]][_nbuf[i][0]];
        if (pi < 0 && c === Cell.Prey) pi = i;
        if (ei < 0 && (c === Cell.Empty || c === Cell.Grass)) ei = i;
      }

      if (pi >= 0) {
        const nx = _nbuf[pi][0];
        const ny = _nbuf[pi][1];

        if (org.energy >= PREDATOR_BREED_ENERGY) {
          grid[ny][nx] = Cell.Predator;
          organisms[ny][nx] = { energy: PREDATOR_INITIAL_ENERGY + 3 };
          org.energy = PREDATOR_INITIAL_ENERGY;
          moved[ny * width + nx] = 1;
        } else {
          grid[ny][nx] = Cell.Predator;
          organisms[ny][nx] = org;
          grid[oy][ox] = Cell.Empty;
          organisms[oy][ox] = null;
          org.energy += 4;
          cx = nx;
          cy = ny;
          moved[ny * width + nx] = 1;
        }
      } else if (ei >= 0) {
        const nx = _nbuf[ei][0];
        const ny = _nbuf[ei][1];
        grid[ny][nx] = Cell.Predator;
        organisms[ny][nx] = org;
        grid[oy][ox] = Cell.Empty;
        organisms[oy][ox] = null;
        org.energy -= 1;
        cx = nx;
        cy = ny;
        moved[ny * width + nx] = 1;
      } else {
        org.energy -= 1;
      }
    }

    // Starvation check
    if (org.energy <= 0) {
      grid[cy][cx] = Cell.Empty;
      organisms[cy][cx] = null;
    }
  }

  // Grass regrows
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === Cell.Empty && Math.random() < GRASS_REGROW_CHANCE) {
        grid[y][x] = Cell.Grass;
      }
    }
  }

  state.generation++;
}

// ANSI 24-bit color codes for each cell type — avoids React element overhead
const ANSI_RESET = "\x1b[0m";
const ANSI_GRASS = "\x1b[38;2;34;170;34m"; // #22aa22
const ANSI_PREY = "\x1b[38;2;255;255;255m"; // #ffffff
const ANSI_PREDATOR = "\x1b[38;2;255;68;68m"; // #ff4444
const ANSI_STATUS = "\x1b[38;2;136;136;136m"; // #888888

const CELL_ANSI = [
  "", // Empty — no color needed for spaces
  ANSI_GRASS,
  ANSI_PREY,
  ANSI_PREDATOR,
];

const CELL_CHARS = [" ", "·", "○", "▲"];

/** Render a grid row as a single pre-colored ANSI string */
function renderRow(row: Cell[]): string {
  let out = "";
  let lastColor = -1;
  for (let x = 0; x < row.length; x++) {
    const cell = row[x];
    if (cell === Cell.Empty) {
      out += " ";
    } else {
      if (cell !== lastColor) {
        out += CELL_ANSI[cell];
        lastColor = cell;
      }
      out += CELL_CHARS[cell];
    }
  }
  if (lastColor >= 0) out += ANSI_RESET;
  return out;
}

/** Render the status bar row */
function renderStatusRow(row: Cell[], status: string): string {
  let out = "";
  let lastAnsi = "";

  // Status portion
  for (let x = 0; x < status.length && x < row.length; x++) {
    const ch = status[x];
    let ansi = ANSI_STATUS;
    if (ch === "·") ansi = ANSI_GRASS;
    else if (ch === "○") ansi = ANSI_PREY;
    else if (ch === "▲") ansi = ANSI_PREDATOR;
    if (ansi !== lastAnsi) {
      out += ansi;
      lastAnsi = ansi;
    }
    out += ch;
  }

  // Rest of row
  for (let x = status.length; x < row.length; x++) {
    const cell = row[x];
    if (cell === Cell.Empty) {
      out += " ";
    } else {
      const ansi = CELL_ANSI[cell];
      if (ansi !== lastAnsi) {
        out += ansi;
        lastAnsi = ansi;
      }
      out += CELL_CHARS[cell];
    }
  }
  if (lastAnsi) out += ANSI_RESET;
  return out;
}

const Ecosystem: React.FC<ScreensaverProps> = ({ columns, rows }) => {
  const contentHeight = rows - 1;
  const stateRef = useRef<EcoState | null>(null);
  const linesRef = useRef<string[]>([]);

  if (
    stateRef.current === null ||
    stateRef.current.width !== columns ||
    stateRef.current.height !== contentHeight
  ) {
    stateRef.current = createState(columns, contentHeight);
    linesRef.current = new Array(contentHeight);
  }

  const state = stateRef.current;
  step(state);

  // Count populations during a single pass
  let preyCount = 0;
  let predatorCount = 0;
  let grassCount = 0;
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const c = state.grid[y][x];
      if (c === Cell.Prey) preyCount++;
      else if (c === Cell.Predator) predatorCount++;
      else if (c === Cell.Grass) grassCount++;
    }
  }

  // Reset on extinction
  if (preyCount === 0 || predatorCount === 0) {
    stateRef.current = createState(columns, contentHeight);
    return null;
  }

  // Pre-render all rows as ANSI strings
  const lines = linesRef.current;
  const lastRow = state.height - 1;
  for (let y = 0; y < lastRow; y++) {
    lines[y] = renderRow(state.grid[y]);
  }
  // Status bar on last row
  const status = ` Gen ${state.generation}  ·${grassCount}  ○${preyCount}  ▲${predatorCount} `;
  lines[lastRow] = renderStatusRow(state.grid[lastRow], status);

  return (
    <Box flexDirection="column">
      {lines.map((line, y) => (
        <Box key={y}>
          <Text>{line}</Text>
        </Box>
      ))}
    </Box>
  );
};

export const ecosystem: ScreensaverModule = {
  name: "ecosystem",
  description:
    "Predator-prey simulation with emergent Lotka-Volterra population dynamics",
  component: Ecosystem,
  fps: 10,
};
