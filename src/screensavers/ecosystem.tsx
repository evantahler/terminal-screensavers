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

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getNeighbors(
  x: number,
  y: number,
  w: number,
  h: number,
): [number, number][] {
  const dirs: [number, number][] = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  const result: [number, number][] = [];
  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
      result.push([nx, ny]);
    }
  }
  return result;
}

function step(state: EcoState): void {
  const { grid, organisms, width, height } = state;

  // Build list of all creatures, shuffled for fairness
  const creatures: [number, number, Cell][] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (grid[y][x] === Cell.Prey || grid[y][x] === Cell.Predator) {
        creatures.push([x, y, grid[y][x]]);
      }
    }
  }
  shuffle(creatures);

  const moved = new Set<string>();

  for (const [ox, oy, type] of creatures) {
    // Check if this creature is still alive (may have been eaten)
    if (grid[oy][ox] !== type) continue;
    if (moved.has(`${ox},${oy}`)) continue;

    const org = organisms[oy][ox];
    if (!org) continue;

    const neighbors = shuffle(getNeighbors(ox, oy, width, height));

    // Track where this organism ends up
    let cx = ox;
    let cy = oy;

    if (type === Cell.Prey) {
      // Prefer grass cells, then empty
      const grassCell = neighbors.find(
        ([nx, ny]) => grid[ny][nx] === Cell.Grass,
      );
      const emptyCell = neighbors.find(
        ([nx, ny]) => grid[ny][nx] === Cell.Empty,
      );
      const target = grassCell || emptyCell;

      if (target) {
        const [nx, ny] = target;
        const ateGrass = grid[ny][nx] === Cell.Grass;

        if (org.energy >= PREY_BREED_ENERGY) {
          // Breed: offspring at new pos, parent stays
          grid[ny][nx] = Cell.Prey;
          organisms[ny][nx] = {
            energy: ateGrass ? PREY_INITIAL_ENERGY + 1 : PREY_INITIAL_ENERGY,
          };
          org.energy = PREY_INITIAL_ENERGY;
          moved.add(`${nx},${ny}`);
        } else {
          grid[ny][nx] = Cell.Prey;
          organisms[ny][nx] = org;
          grid[oy][ox] = Cell.Empty;
          organisms[oy][ox] = null;
          org.energy += ateGrass ? 2 : -1;
          cx = nx;
          cy = ny;
          moved.add(`${nx},${ny}`);
        }
      } else {
        org.energy -= 1;
      }
    } else {
      // Predator tries to eat prey, otherwise moves
      const preyCell = neighbors.find(([nx, ny]) => grid[ny][nx] === Cell.Prey);

      if (preyCell) {
        const [nx, ny] = preyCell;

        if (org.energy >= PREDATOR_BREED_ENERGY) {
          // Breed: offspring at new pos eating prey, parent stays
          grid[ny][nx] = Cell.Predator;
          organisms[ny][nx] = { energy: PREDATOR_INITIAL_ENERGY + 3 };
          org.energy = PREDATOR_INITIAL_ENERGY;
          moved.add(`${nx},${ny}`);
        } else {
          grid[ny][nx] = Cell.Predator;
          organisms[ny][nx] = org;
          grid[oy][ox] = Cell.Empty;
          organisms[oy][ox] = null;
          org.energy += 4;
          cx = nx;
          cy = ny;
          moved.add(`${nx},${ny}`);
        }
      } else {
        const emptyCell = neighbors.find(
          ([nx, ny]) =>
            grid[ny][nx] === Cell.Empty || grid[ny][nx] === Cell.Grass,
        );
        if (emptyCell) {
          const [nx, ny] = emptyCell;
          grid[ny][nx] = Cell.Predator;
          organisms[ny][nx] = org;
          grid[oy][ox] = Cell.Empty;
          organisms[oy][ox] = null;
          org.energy -= 1;
          cx = nx;
          cy = ny;
          moved.add(`${nx},${ny}`);
        } else {
          org.energy -= 1;
        }
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

const CELL_CHARS: Record<Cell, string> = {
  [Cell.Empty]: " ",
  [Cell.Grass]: "·",
  [Cell.Prey]: "○",
  [Cell.Predator]: "▲",
};

const CELL_COLORS: Record<Cell, string> = {
  [Cell.Empty]: "",
  [Cell.Grass]: "#22aa22",
  [Cell.Prey]: "#ffffff",
  [Cell.Predator]: "#ff4444",
};

const Ecosystem: React.FC<ScreensaverProps> = ({ columns, rows }) => {
  const contentHeight = rows - 1;
  const stateRef = useRef<EcoState | null>(null);

  if (
    stateRef.current === null ||
    stateRef.current.width !== columns ||
    stateRef.current.height !== contentHeight
  ) {
    stateRef.current = createState(columns, contentHeight);
  }

  const state = stateRef.current;
  step(state);

  // Count populations
  let preyCount = 0;
  let predatorCount = 0;
  let grassCount = 0;
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      if (state.grid[y][x] === Cell.Prey) preyCount++;
      else if (state.grid[y][x] === Cell.Predator) predatorCount++;
      else if (state.grid[y][x] === Cell.Grass) grassCount++;
    }
  }

  // Reset on extinction
  if (preyCount === 0 || predatorCount === 0) {
    stateRef.current = createState(columns, contentHeight);
    return null;
  }

  // Build status line
  const status = ` Gen ${state.generation}  ·${grassCount}  ○${preyCount}  ▲${predatorCount} `;

  return (
    <Box flexDirection="column">
      {state.grid.map((row, y) => {
        // Overlay status on last row
        if (y === state.height - 1) {
          const chars: React.ReactNode[] = [];
          for (let x = 0; x < row.length; x++) {
            if (x < status.length) {
              const ch = status[x];
              let color = "#888888";
              if (ch === "·") color = "#22aa22";
              else if (ch === "○") color = "#ffffff";
              else if (ch === "▲") color = "#ff4444";
              chars.push(
                <Text key={x} color={color}>
                  {ch}
                </Text>,
              );
            } else {
              const cell = row[x];
              if (cell === Cell.Empty) {
                chars.push(" ");
              } else {
                chars.push(
                  <Text key={x} color={CELL_COLORS[cell]}>
                    {CELL_CHARS[cell]}
                  </Text>,
                );
              }
            }
          }
          return (
            <Box key={y}>
              <Text>{chars}</Text>
            </Box>
          );
        }

        // Normal row: group consecutive same-type cells for performance
        const segments: React.ReactNode[] = [];
        let run = "";
        let runColor = "";
        let segIdx = 0;
        for (let x = 0; x < row.length; x++) {
          const cell = row[x];
          const ch = CELL_CHARS[cell];
          const color = CELL_COLORS[cell];
          if (cell === Cell.Empty) {
            if (runColor !== "") {
              segments.push(
                <Text key={segIdx++} color={runColor}>
                  {run}
                </Text>,
              );
              run = "";
              runColor = "";
            }
            run += " ";
          } else if (color === runColor) {
            run += ch;
          } else {
            if (run) {
              if (runColor) {
                segments.push(
                  <Text key={segIdx++} color={runColor}>
                    {run}
                  </Text>,
                );
              } else {
                segments.push(run);
              }
            }
            run = ch;
            runColor = color;
          }
        }
        if (run) {
          if (runColor) {
            segments.push(
              <Text key={segIdx++} color={runColor}>
                {run}
              </Text>,
            );
          } else {
            segments.push(run);
          }
        }
        return (
          <Box key={y}>
            <Text>{segments}</Text>
          </Box>
        );
      })}
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
