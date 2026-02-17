import { Box, Text } from "ink";
import React, { useRef } from "react";
import type { ScreensaverModule, ScreensaverProps } from "../types.js";

interface Star {
  x: number;
  y: number;
  z: number;
}

function createStar(): Star {
  return {
    x: (Math.random() - 0.5) * 200,
    y: (Math.random() - 0.5) * 200,
    z: Math.random() * 100,
  };
}

function Starfield({ columns, rows }: ScreensaverProps) {
  const starsRef = useRef<Star[]>(
    Array.from({ length: 150 }, () => createStar()),
  );
  const stars = starsRef.current;

  const cx = Math.floor(columns / 2);
  const cy = Math.floor(rows / 2);

  // Build grid
  const grid: string[][] = Array.from({ length: rows - 1 }, () =>
    Array.from({ length: columns }, () => " "),
  );
  const brightness: number[][] = Array.from({ length: rows - 1 }, () =>
    Array.from({ length: columns }, () => 0),
  );

  for (let i = 0; i < stars.length; i++) {
    const star = stars[i];

    // Move star toward viewer
    star.z -= 1.5;
    if (star.z <= 0) {
      Object.assign(star, createStar());
      star.z = 100;
      continue;
    }

    // Project to 2D
    const sx = Math.floor(cx + (star.x / star.z) * 40);
    const sy = Math.floor(cy + (star.y / star.z) * 20);

    if (sx < 0 || sx >= columns || sy < 0 || sy >= rows - 1) continue;

    const depth = 1 - star.z / 100;

    if (depth > 0.8) {
      grid[sy][sx] = "@";
      brightness[sy][sx] = 3;
    } else if (depth > 0.5) {
      grid[sy][sx] = "*";
      brightness[sy][sx] = 2;
    } else if (depth > 0.2) {
      grid[sy][sx] = "+";
      brightness[sy][sx] = 1;
    } else {
      grid[sy][sx] = ".";
      brightness[sy][sx] = 0;
    }
  }

  const lines = grid.map((row, y) => {
    const chars = row.map((ch, x) => {
      if (ch === " ") return ch;
      const b = brightness[y][x];
      const color =
        b === 3
          ? "white"
          : b === 2
            ? "#cccccc"
            : b === 1
              ? "#888888"
              : "#555555";
      return (
        <Text key={x} color={color} bold={b === 3}>
          {ch}
        </Text>
      );
    });
    return (
      <Box key={y}>
        <Text>{chars}</Text>
      </Box>
    );
  });

  return <Box flexDirection="column">{lines}</Box>;
}

export const starfield: ScreensaverModule = {
  name: "starfield",
  description: "3D stars flying toward the viewer",
  component: Starfield,
  fps: 20,
};
