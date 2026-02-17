import { Box, Text } from "ink";
import type React from "react";
import { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

interface Fish {
  x: number;
  y: number;
  dx: number;
  type: number;
  color: string;
}

interface Bubble {
  x: number;
  y: number;
  speed: number;
}

interface Seaweed {
  x: number;
  phase: number;
}

const FISH_RIGHT = ["><>", "><))'>", ">°)))><"];
const FISH_LEFT = ["<><", "<'((<>", "><((((°>"];
const FISH_COLORS = ["cyan", "yellow", "magenta", "green", "red"];
const BUBBLE_CHARS = ["°", "o"];

const Aquarium: React.FC<ScreensaverProps> = ({
  columns,
  rows,
  frame,
  elapsed,
}) => {
  const state = useRef<{
    fish: Fish[];
    bubbles: Bubble[];
    seaweed: Seaweed[];
    initialized: boolean;
  }>({
    fish: [],
    bubbles: [],
    seaweed: [],
    initialized: false,
  });

  if (!state.current.initialized) {
    // Initialize fish (8-12 scaled by columns)
    const fishCount = Math.floor(8 + (columns / 80) * 4);
    state.current.fish = Array.from({ length: fishCount }, () => {
      const goingRight = Math.random() > 0.5;
      return {
        x: Math.floor(Math.random() * columns),
        y: Math.floor(Math.random() * (rows - 7)) + 1,
        dx: goingRight
          ? Math.random() * 1.5 + 0.5
          : -(Math.random() * 1.5 + 0.5),
        type: Math.floor(Math.random() * 3),
        color: FISH_COLORS[Math.floor(Math.random() * FISH_COLORS.length)],
      };
    });

    // Initialize bubbles
    state.current.bubbles = Array.from({ length: 15 }, () => ({
      x: Math.floor(Math.random() * columns),
      y: Math.floor(Math.random() * (rows - 1)),
      speed: Math.random() * 0.3 + 0.2,
    }));

    // Initialize seaweed (6-10 stalks)
    const seaweedCount = Math.floor(6 + Math.random() * 5);
    state.current.seaweed = Array.from({ length: seaweedCount }, () => ({
      x: Math.floor(Math.random() * columns),
      phase: Math.random() * Math.PI * 2,
    }));

    state.current.initialized = true;
  }

  // Update fish positions
  for (const fish of state.current.fish) {
    fish.x += fish.dx;

    // Wrap around screen
    if (fish.dx > 0 && fish.x >= columns) {
      fish.x = -10;
      fish.y = Math.floor(Math.random() * (rows - 7)) + 1;
    } else if (fish.dx < 0 && fish.x < -10) {
      fish.x = columns;
      fish.y = Math.floor(Math.random() * (rows - 7)) + 1;
    }
  }

  // Update bubble positions
  for (const bubble of state.current.bubbles) {
    bubble.y -= bubble.speed;

    // Respawn at bottom when reaching top
    if (bubble.y < 0) {
      bubble.y = rows - 2;
      bubble.x = Math.floor(Math.random() * columns);
    }
  }

  // Build grid
  const grid: { char: string; color: string }[][] = Array.from(
    { length: rows },
    () =>
      Array.from({ length: columns }, () => ({ char: " ", color: "white" })),
  );

  // Draw seaweed
  for (const weed of state.current.seaweed) {
    const height = Math.floor(Math.random() * 4) + 3;
    const x = Math.floor(weed.x);
    for (let i = 0; i < height; i++) {
      const y = rows - 2 - i;
      if (y >= 0 && y < rows - 1 && x >= 0 && x < columns) {
        const oscillation = Math.sin(weed.phase + frame * 0.1 + i * 0.3);
        grid[y][x] = {
          char: oscillation > 0 ? "}" : "{",
          color: "green",
        };
      }
    }
  }

  // Draw bubbles
  for (const bubble of state.current.bubbles) {
    const x = Math.floor(bubble.x);
    const y = Math.floor(bubble.y);
    if (y >= 0 && y < rows - 1 && x >= 0 && x < columns) {
      grid[y][x] = {
        char: BUBBLE_CHARS[Math.floor(Math.random() * BUBBLE_CHARS.length)],
        color: "cyan",
      };
    }
  }

  // Draw fish
  for (const fish of state.current.fish) {
    const x = Math.floor(fish.x);
    const y = Math.floor(fish.y);
    const fishChars =
      fish.dx > 0 ? FISH_RIGHT[fish.type] : FISH_LEFT[fish.type];

    for (let i = 0; i < fishChars.length; i++) {
      const drawX = x + i;
      if (y >= 0 && y < rows - 1 && drawX >= 0 && drawX < columns) {
        grid[y][drawX] = {
          char: fishChars[i],
          color: fish.color,
        };
      }
    }
  }

  // Draw sandy floor
  for (let x = 0; x < columns; x++) {
    grid[rows - 1][x] = { char: "~", color: "yellow" };
  }

  // Render grid
  return (
    <Box flexDirection="column">
      {grid.map((row, y) => (
        <Box key={y}>
          {row.map((cell, x) => (
            <Text key={x} color={cell.color}>
              {cell.char}
            </Text>
          ))}
        </Box>
      ))}
    </Box>
  );
};

export const aquarium: ScreensaverModule = {
  name: "aquarium",
  description: "Fish, bubbles, and seaweed in an ASCII aquarium",
  component: Aquarium,
  fps: 6,
};
