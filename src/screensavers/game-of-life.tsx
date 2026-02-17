import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

const GameOfLife: React.FC<ScreensaverProps> = ({
  columns,
  rows,
  frame,
  elapsed,
}) => {
  const gridRef = useRef<boolean[][] | null>(null);
  const populationHistoryRef = useRef<number[]>([]);
  const lastRandomizeRef = useRef(0);

  const height = rows - 1;
  const width = columns;

  // Initialize grid on first render
  if (gridRef.current === null) {
    gridRef.current = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => Math.random() < 0.2),
    );
  }

  const grid = gridRef.current;

  // Count neighbors for a cell
  const countNeighbors = (y: number, x: number): number => {
    let count = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dy === 0 && dx === 0) continue;
        const ny = (y + dy + height) % height;
        const nx = (x + dx + width) % width;
        if (grid[ny][nx]) count++;
      }
    }
    return count;
  };

  // Compute next generation
  const nextGrid = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const neighbors = countNeighbors(y, x);
      const alive = grid[y][x];
      if (alive) {
        return neighbors === 2 || neighbors === 3;
      }
      return neighbors === 3;
    }),
  );

  // Count population
  const population = nextGrid.reduce(
    (sum, row) => sum + row.filter((cell) => cell).length,
    0,
  );

  // Track population history
  populationHistoryRef.current.push(population);
  if (populationHistoryRef.current.length > 10) {
    populationHistoryRef.current.shift();
  }

  // Check for stagnation (same count for 10+ frames)
  const isStagnant =
    populationHistoryRef.current.length >= 10 &&
    populationHistoryRef.current.every(
      (p) => p === populationHistoryRef.current[0],
    );

  // Randomize ~5% of cells if stagnant and enough time has passed
  if (isStagnant && frame - lastRandomizeRef.current > 20) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (Math.random() < 0.05) {
          nextGrid[y][x] = Math.random() < 0.5;
        }
      }
    }
    lastRandomizeRef.current = frame;
    populationHistoryRef.current = [];
  }

  gridRef.current = nextGrid;

  // Render grid
  return (
    <Box flexDirection="column">
      {nextGrid.map((row, y) => (
        <Box key={y}>
          <Text color="green">
            {row.map((cell) => (cell ? "█" : " ")).join("")}
          </Text>
        </Box>
      ))}
    </Box>
  );
};

export const gameOfLife: ScreensaverModule = {
  name: "game-of-life",
  description: "Conway's Game of Life cellular automaton",
  component: GameOfLife,
  fps: 8,
};
