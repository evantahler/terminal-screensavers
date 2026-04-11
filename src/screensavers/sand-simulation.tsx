import { Box } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";
import { type SparseCell, renderSparseRow } from "./utils.js";

// Sand particle types with distinct colors
const SAND_TYPES = [
  { color: "#e6c35c" }, // golden sand
  { color: "#d4a843" }, // dark gold
  { color: "#c49232" }, // amber
  { color: "#f0d68a" }, // light sand
  { color: "#b87333" }, // copper
  { color: "#cd853f" }, // peru
  { color: "#deb887" }, // burlywood
  { color: "#d2691e" }, // chocolate
];

// 0 = empty, positive = sand type index + 1
type Cell = number;

interface SandState {
  grid: Cell[][];
  width: number;
  height: number;
  frameCount: number;
  fillCount: number;
}

function createGrid(width: number, height: number): Cell[][] {
  return Array.from({ length: height }, () => Array(width).fill(0));
}

const CHAR = "█";

const SandSimulation: React.FC<ScreensaverProps> = ({ columns, rows }) => {
  const stateRef = useRef<SandState | null>(null);

  const height = rows - 1;
  const width = columns;

  // Initialize or resize
  if (
    !stateRef.current ||
    stateRef.current.width !== width ||
    stateRef.current.height !== height
  ) {
    stateRef.current = {
      grid: createGrid(width, height),
      width,
      height,
      frameCount: 0,
      fillCount: 0,
    };
  }

  const state = stateRef.current;
  state.frameCount++;

  // Spawn new sand grains at the top
  const spawnCount = Math.max(1, Math.floor(width / 12));
  for (let i = 0; i < spawnCount; i++) {
    const x = Math.floor(Math.random() * width);
    if (state.grid[0][x] === 0) {
      state.grid[0][x] = Math.floor(Math.random() * SAND_TYPES.length) + 1;
      state.fillCount++;
    }
  }

  // Simulate falling — iterate bottom-up so each grain moves once per frame
  // Alternate scan direction each frame to avoid left/right bias
  const leftToRight = state.frameCount % 2 === 0;

  for (let y = height - 2; y >= 0; y--) {
    const startX = leftToRight ? 0 : width - 1;
    const endX = leftToRight ? width : -1;
    const stepX = leftToRight ? 1 : -1;

    for (let x = startX; x !== endX; x += stepX) {
      const cell = state.grid[y][x];
      if (cell === 0) continue;

      // Try to fall straight down
      if (state.grid[y + 1][x] === 0) {
        state.grid[y + 1][x] = cell;
        state.grid[y][x] = 0;
        continue;
      }

      // Try to slide diagonally — randomize which side to check first
      const goLeft = Math.random() < 0.5;
      const dx1 = goLeft ? -1 : 1;
      const dx2 = goLeft ? 1 : -1;

      if (x + dx1 >= 0 && x + dx1 < width && state.grid[y + 1][x + dx1] === 0) {
        state.grid[y + 1][x + dx1] = cell;
        state.grid[y][x] = 0;
      } else if (
        x + dx2 >= 0 &&
        x + dx2 < width &&
        state.grid[y + 1][x + dx2] === 0
      ) {
        state.grid[y + 1][x + dx2] = cell;
        state.grid[y][x] = 0;
      }
    }
  }

  // Reset when screen is mostly full
  const totalCells = width * height;
  if (state.fillCount > totalCells * 0.85) {
    state.grid = createGrid(width, height);
    state.fillCount = 0;
  }

  // Render using sparse rows for performance
  const sparseGrid: (SparseCell | null)[][] = state.grid.map((row) =>
    row.map((cell) => {
      if (cell === 0) return null;
      return { char: CHAR, color: SAND_TYPES[cell - 1].color };
    }),
  );

  return (
    <Box flexDirection="column">
      {sparseGrid.map((row, y) => renderSparseRow(row, y))}
    </Box>
  );
};

export const sandSimulation: ScreensaverModule = {
  name: "sand-simulation",
  description:
    "Falling sand particles that pile up and cascade with layered colors",
  component: SandSimulation,
  fps: 30,
};
