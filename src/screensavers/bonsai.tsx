import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

interface Branch {
  x: number;
  y: number;
  dx: number;
  dy: number;
  life: number;
  type: "trunk" | "branch" | "leaves";
}

interface Cell {
  char: string;
  color: string;
}

const Bonsai: React.FC<ScreensaverProps> = ({ columns, rows, frame }) => {
  const state = useRef<{
    grid: (Cell | null)[][];
    branches: Branch[];
    phase: "growing" | "done";
    doneFrames: number;
    initialized: boolean;
  }>({
    grid: [],
    branches: [],
    phase: "growing",
    doneFrames: 0,
    initialized: false,
  });

  const init = () => {
    const grid: (Cell | null)[][] = Array.from({ length: rows - 1 }, () =>
      Array(columns).fill(null),
    );
    const centerX = Math.floor(columns / 2);
    const startY = rows - 4;
    const initialLife = Math.floor(rows * 0.4);

    state.current = {
      grid,
      branches: [
        {
          x: centerX,
          y: startY,
          dx: 0,
          dy: -1,
          life: initialLife,
          type: "trunk",
        },
      ],
      phase: "growing",
      doneFrames: 0,
      initialized: true,
    };
  };

  if (!state.current.initialized || columns === 0 || rows === 0) {
    init();
  }

  const { grid, branches, phase, doneFrames } = state.current;

  // Update branches
  if (phase === "growing") {
    const activeBranches: Branch[] = [];

    for (const branch of branches) {
      if (branch.life <= 0) continue;

      // Move branch
      let newX = branch.x + branch.dx;
      const newY = branch.y + branch.dy;

      // Add wobble
      const wobble = Math.random() * 0.4 - 0.2;
      if (branch.type === "trunk") {
        newX += wobble > 0.15 ? 1 : wobble < -0.15 ? -1 : 0;
      }

      // Bounds check
      if (newX < 0 || newX >= columns || newY < 0 || newY >= rows - 1) {
        continue;
      }

      // Draw to grid
      let char = "║";
      let color = "#8B4513";

      if (branch.type === "trunk") {
        char = "║";
        color = "#8B4513";
      } else if (branch.type === "branch") {
        if (branch.dx > 0) {
          char = "╱";
        } else if (branch.dx < 0) {
          char = "╲";
        } else {
          char = "│";
        }
        color = "#8B4513";
      } else if (branch.type === "leaves") {
        char = Math.random() > 0.5 ? "&" : "%";
        color = char === "&" ? "#228B22" : "#FF69B4";
      }

      grid[newY][newX] = { char, color };

      // Update branch
      const newLife = branch.life - 1;
      const lifePercent = newLife / (rows * 0.4);

      activeBranches.push({
        x: newX,
        y: newY,
        dx: branch.dx,
        dy: branch.dy,
        life: newLife,
        type: branch.type,
      });

      // Spawn side branches
      if (
        branch.type === "trunk" &&
        lifePercent < 0.6 &&
        Math.random() < 0.15
      ) {
        const direction = Math.random() > 0.5 ? 1 : -1;
        activeBranches.push({
          x: newX,
          y: newY,
          dx: direction,
          dy: -1,
          life: Math.floor(rows * 0.2),
          type: "branch",
        });
      }

      // Spawn more branches from branches
      if (
        branch.type === "branch" &&
        lifePercent < 0.5 &&
        Math.random() < 0.1
      ) {
        const direction = Math.random() > 0.5 ? 1 : -1;
        activeBranches.push({
          x: newX,
          y: newY,
          dx: direction,
          dy: branch.dy,
          life: Math.floor(rows * 0.15),
          type: "branch",
        });
      }

      // Transition to leaves
      if (
        (branch.type === "trunk" || branch.type === "branch") &&
        lifePercent < 0.3 &&
        Math.random() < 0.2
      ) {
        activeBranches.push({
          x: newX,
          y: newY,
          dx: Math.random() > 0.5 ? 1 : -1,
          dy: Math.random() > 0.5 ? -1 : 0,
          life: Math.floor(rows * 0.1),
          type: "leaves",
        });
      }
    }

    state.current.branches = activeBranches;

    if (activeBranches.length === 0) {
      state.current.phase = "done";
      state.current.doneFrames = 0;
    }
  } else if (phase === "done") {
    state.current.doneFrames = doneFrames + 1;
    if (doneFrames >= 60) {
      init();
    }
  }

  // Draw pot
  const potY = rows - 3;
  const potCenterX = Math.floor(columns / 2);
  const potWidth = 8;
  const potStart = potCenterX - Math.floor(potWidth / 2);

  for (let i = 0; i < potWidth; i++) {
    const x = potStart + i;
    if (x >= 0 && x < columns) {
      if (i === 0) {
        grid[potY][x] = { char: "╔", color: "#8B4513" };
        grid[potY + 1][x] = { char: "║", color: "#8B4513" };
        grid[potY + 2][x] = { char: "╚", color: "#8B4513" };
      } else if (i === potWidth - 1) {
        grid[potY][x] = { char: "╗", color: "#8B4513" };
        grid[potY + 1][x] = { char: "║", color: "#8B4513" };
        grid[potY + 2][x] = { char: "╝", color: "#8B4513" };
      } else {
        grid[potY][x] = { char: "═", color: "#8B4513" };
        grid[potY + 1][x] = { char: " ", color: "#8B4513" };
        grid[potY + 2][x] = { char: "═", color: "#8B4513" };
      }
    }
  }

  // Render grid
  return (
    <Box flexDirection="column">
      {grid.map((row, y) => (
        <Box key={y}>
          {row.map((cell, x) => (
            <Text key={x} color={cell?.color || undefined}>
              {cell?.char || " "}
            </Text>
          ))}
        </Box>
      ))}
    </Box>
  );
};

export const bonsai: ScreensaverModule = {
  name: "bonsai",
  description: "Procedurally growing bonsai tree",
  component: Bonsai,
  fps: 6,
};
