import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

interface Cell {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface SolverState {
  path: Set<string>;
  visited: Set<string>;
  stack: Position[];
  current: Position | null;
}

const Maze: React.FC<ScreensaverProps> = ({ columns, rows, frame }) => {
  const width = Math.floor(columns / 2);
  const height = Math.floor((rows - 1) / 2);

  const state = useRef<{
    maze: Cell[][];
    visited: boolean[][];
    stack: Position[];
    phase: "generating" | "solving" | "done";
    solver: SolverState;
    doneFrames: number;
    currentCell: Position | null;
  }>({
    maze: Array(height)
      .fill(null)
      .map(() =>
        Array(width)
          .fill(null)
          .map(() => ({ top: true, right: true, bottom: true, left: true })),
      ),
    visited: Array(height)
      .fill(null)
      .map(() => Array(width).fill(false)),
    stack: [{ x: 0, y: 0 }],
    phase: "generating",
    solver: {
      path: new Set<string>(),
      visited: new Set<string>(),
      stack: [],
      current: null,
    },
    doneFrames: 0,
    currentCell: { x: 0, y: 0 },
  });

  const s = state.current;

  // Helper to get unvisited neighbors
  const getUnvisitedNeighbors = (x: number, y: number): Position[] => {
    const neighbors: Position[] = [];
    if (y > 0 && !s.visited[y - 1]?.[x]) neighbors.push({ x, y: y - 1 });
    if (x < width - 1 && !s.visited[y]?.[x + 1])
      neighbors.push({ x: x + 1, y });
    if (y < height - 1 && !s.visited[y + 1]?.[x])
      neighbors.push({ x, y: y + 1 });
    if (x > 0 && !s.visited[y]?.[x - 1]) neighbors.push({ x: x - 1, y });
    return neighbors;
  };

  // Helper to remove wall between cells
  const removeWall = (from: Position, to: Position) => {
    if (to.y < from.y) {
      // Moving up
      s.maze[from.y][from.x].top = false;
      s.maze[to.y][to.x].bottom = false;
    } else if (to.x > from.x) {
      // Moving right
      s.maze[from.y][from.x].right = false;
      s.maze[to.y][to.x].left = false;
    } else if (to.y > from.y) {
      // Moving down
      s.maze[from.y][from.x].bottom = false;
      s.maze[to.y][to.x].top = false;
    } else if (to.x < from.x) {
      // Moving left
      s.maze[from.y][from.x].left = false;
      s.maze[to.y][to.x].right = false;
    }
  };

  // Helper to get accessible neighbors for solving
  const getAccessibleNeighbors = (x: number, y: number): Position[] => {
    const neighbors: Position[] = [];
    const cell = s.maze[y]?.[x];
    if (!cell) return neighbors;

    if (!cell.top && y > 0) neighbors.push({ x, y: y - 1 });
    if (!cell.right && x < width - 1) neighbors.push({ x: x + 1, y });
    if (!cell.bottom && y < height - 1) neighbors.push({ x, y: y + 1 });
    if (!cell.left && x > 0) neighbors.push({ x: x - 1, y });
    return neighbors;
  };

  const posKey = (pos: Position) => `${pos.x},${pos.y}`;

  // Maze generation phase
  if (s.phase === "generating") {
    const stepsPerFrame = Math.min(
      5,
      Math.max(3, Math.floor((width * height) / 50)),
    );
    for (let step = 0; step < stepsPerFrame && s.stack.length > 0; step++) {
      const current = s.stack[s.stack.length - 1];
      if (!current) break;

      s.currentCell = current;
      s.visited[current.y][current.x] = true;

      const neighbors = getUnvisitedNeighbors(current.x, current.y);
      if (neighbors.length > 0) {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        if (next) {
          removeWall(current, next);
          s.stack.push(next);
        }
      } else {
        s.stack.pop();
      }
    }

    if (s.stack.length === 0) {
      s.phase = "solving";
      s.solver.stack = [{ x: 0, y: 0 }];
      s.solver.visited.add("0,0");
      s.solver.current = { x: 0, y: 0 };
    }
  }

  // Solving phase
  if (s.phase === "solving") {
    const stepsPerFrame = Math.min(
      3,
      Math.max(2, Math.floor((width * height) / 100)),
    );
    for (
      let step = 0;
      step < stepsPerFrame && s.solver.stack.length > 0;
      step++
    ) {
      const current = s.solver.stack[s.solver.stack.length - 1];
      if (!current) break;

      s.solver.current = current;

      // Check if we reached the goal
      if (current.x === width - 1 && current.y === height - 1) {
        s.solver.path.add(posKey(current));
        s.phase = "done";
        break;
      }

      const neighbors = getAccessibleNeighbors(current.x, current.y).filter(
        (n) => !s.solver.visited.has(posKey(n)),
      );

      if (neighbors.length > 0) {
        const next = neighbors[0];
        if (next) {
          s.solver.visited.add(posKey(next));
          s.solver.stack.push(next);
          s.solver.path.add(posKey(next));
        }
      } else {
        const popped = s.solver.stack.pop();
        if (popped) {
          s.solver.path.delete(posKey(popped));
        }
      }
    }
  }

  // Done phase - wait then reset
  if (s.phase === "done") {
    s.doneFrames++;
    if (s.doneFrames > 30) {
      // Reset everything
      s.maze = Array(height)
        .fill(null)
        .map(() =>
          Array(width)
            .fill(null)
            .map(() => ({ top: true, right: true, bottom: true, left: true })),
        );
      s.visited = Array(height)
        .fill(null)
        .map(() => Array(width).fill(false));
      s.stack = [{ x: 0, y: 0 }];
      s.phase = "generating";
      s.solver = {
        path: new Set<string>(),
        visited: new Set<string>(),
        stack: [],
        current: null,
      };
      s.doneFrames = 0;
      s.currentCell = { x: 0, y: 0 };
    }
  }

  // Render the maze
  const output: string[] = [];
  for (let y = 0; y < height; y++) {
    let line = "";
    for (let x = 0; x < width; x++) {
      const cell = s.maze[y]?.[x];
      if (!cell) continue;

      const key = posKey({ x, y });
      const isCurrentGen =
        s.phase === "generating" &&
        s.currentCell?.x === x &&
        s.currentCell?.y === y;
      const isCurrentSolve =
        s.phase === "solving" &&
        s.solver.current?.x === x &&
        s.solver.current?.y === y;
      const isInPath = s.solver.path.has(key);
      const isVisitedGen = s.visited[y]?.[x];

      if (isCurrentGen) {
        line += "\x1b[32m█ \x1b[0m"; // Green for current generation position
      } else if (isInPath) {
        line += "\x1b[36m· \x1b[0m"; // Cyan for solution path
      } else if (isCurrentSolve) {
        line += "\x1b[33m· \x1b[0m"; // Yellow for current solving position
      } else if (isVisitedGen) {
        line += "  "; // Empty passage
      } else {
        line += "\x1b[90m█ \x1b[0m"; // Gray wall
      }
    }
    output.push(line);
  }

  return (
    <Box flexDirection="column">
      {output.map((line, y) => (
        <Box key={y}>
          <Text>{line}</Text>
        </Box>
      ))}
    </Box>
  );
};

export const maze: ScreensaverModule = {
  name: "maze",
  description: "Animated maze generation and solving",
  component: Maze,
  fps: 15,
};
