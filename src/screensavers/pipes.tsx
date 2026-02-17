import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

// Box-drawing characters for pipe directions
// Direction: 0=up, 1=right, 2=down, 3=left
const PIPE_CHARS: Record<string, string> = {
  "0-0": "│",
  "2-2": "│",
  "1-1": "─",
  "3-3": "─",
  "0-1": "┌",
  "0-3": "┐",
  "2-1": "└",
  "2-3": "┘",
  "1-0": "┘",
  "1-2": "└",
  "3-0": "┐",
  "3-2": "┌",
};

const COLORS = ["green", "cyan", "magenta", "yellow", "red", "blue"];

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

interface Pipe {
  x: number;
  y: number;
  dir: number;
  color: string;
}

interface Cell {
  char: string;
  color: string;
}

function Pipes({ columns, rows }: ScreensaverProps) {
  const gridRef = useRef<(Cell | null)[][]>(
    Array.from({ length: rows - 1 }, () =>
      Array.from({ length: columns }, () => null),
    ),
  );
  const pipesRef = useRef<Pipe[]>([]);
  const fillCountRef = useRef(0);

  const grid = gridRef.current;
  const pipes = pipesRef.current;
  const maxCells = (rows - 1) * columns;

  // Reset if grid is mostly full
  if (fillCountRef.current > maxCells * 0.6) {
    for (let y = 0; y < rows - 1; y++) {
      for (let x = 0; x < columns; x++) {
        grid[y][x] = null;
      }
    }
    pipes.length = 0;
    fillCountRef.current = 0;
  }

  // Spawn new pipes if needed
  while (pipes.length < 3) {
    pipes.push({
      x: Math.floor(Math.random() * columns),
      y: Math.floor(Math.random() * (rows - 1)),
      dir: Math.floor(Math.random() * 4),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
  }

  // Advance each pipe a few steps per frame
  for (const pipe of pipes) {
    for (let step = 0; step < 3; step++) {
      const oldDir = pipe.dir;

      // Maybe turn (30% chance)
      let newDir = oldDir;
      if (Math.random() < 0.3) {
        newDir = Math.random() < 0.5 ? (oldDir + 1) % 4 : (oldDir + 3) % 4;
      }

      const key = `${oldDir}-${newDir}`;
      const char = PIPE_CHARS[key] || "│";

      if (pipe.y >= 0 && pipe.y < rows - 1 && pipe.x >= 0 && pipe.x < columns) {
        if (!grid[pipe.y][pipe.x]) fillCountRef.current++;
        grid[pipe.y][pipe.x] = { char, color: pipe.color };
      }

      pipe.dir = newDir;
      pipe.x += DX[newDir];
      pipe.y += DY[newDir];

      // Wrap around
      if (pipe.x < 0) pipe.x = columns - 1;
      if (pipe.x >= columns) pipe.x = 0;
      if (pipe.y < 0) pipe.y = rows - 2;
      if (pipe.y >= rows - 1) pipe.y = 0;
    }
  }

  const lines = grid.map((row, y) => {
    const segments: React.ReactNode[] = [];
    let spaces = "";
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      if (!cell) {
        spaces += " ";
      } else {
        if (spaces) {
          segments.push(spaces);
          spaces = "";
        }
        segments.push(
          <Text key={x} color={cell.color}>
            {cell.char}
          </Text>,
        );
      }
    }
    if (spaces) segments.push(spaces);
    return (
      <Box key={y}>
        <Text>{segments}</Text>
      </Box>
    );
  });

  return <Box flexDirection="column">{lines}</Box>;
}

export const pipes: ScreensaverModule = {
  name: "pipes",
  description: "Random pipe segments with box-drawing characters",
  component: Pipes,
  fps: 15,
};
